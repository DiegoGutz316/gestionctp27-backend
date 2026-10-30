import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';

import { MailService } from '../../common/mail/mail.service';
import { obtenerOrigenesPermitidos } from '../../common/http/origenes-permitidos';
import { UsuariosService } from '../usuarios/usuarios.service';
import { IntentosLoginService } from './intentos-login.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import type { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import type { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import type { LoginDto } from './dto/login.dto';
import type { RestablecerContrasenaDto } from './dto/restablecer-contrasena.dto';
import type { SolicitarRestablecimientoDto } from './dto/solicitar-restablecimiento.dto';
import { TokenRestablecerContrasena } from './entities/token-restablecer-contrasena.entity';
import type {
  JwtPayload,
  UsuarioAutenticado,
} from './tipos/jwt-payload';
import type { ResultadoLogin } from './tipos/respuesta-login';
import {
  construirOpcionesCookie,
  opcionesClearCookie,
  opcionesSetCookie,
  type OpcionesCookieAuth,
} from './constantes/cookie-auth';

const VIDA_TOKEN_RESTABLECER_MS = 60 * 60 * 1000;

/**
 * Mensaje unico para correo inexistente y contrasena incorrecta.
 * Diferenciarlos permitiria averiguar que correos estan registrados.
 */
const CREDENCIALES_INVALIDAS = 'El correo o la contraseña no son correctos.';

/**
 * Hash valido de una contrasena que nadie conoce. Se compara contra el cuando
 * el correo no existe, para que la respuesta tarde lo mismo en ambos casos y
 * no se pueda deducir la existencia del usuario midiendo el tiempo.
 */
const HASH_SENUELO =
  '$2b$12$C6UzMDM.H6dfI/f/IKcEe.aH3vXH1n5Xn5s5b5o3P1u3Q6qL9K2Bu';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly opcionesCookie: OpcionesCookieAuth;

  constructor(
    private readonly usuarios: UsuariosService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly intentos: IntentosLoginService,
    private readonly mail: MailService,
    @InjectRepository(TokenRestablecerContrasena)
    private readonly tokensRestablecer: Repository<TokenRestablecerContrasena>,
  ) {
    this.opcionesCookie = construirOpcionesCookie((key) =>
      this.config.get<string>(key),
    );
  }

  /**
   * Tasks: "Validar credenciales del usuario" y "Validar que el usuario este activo".
   *
   * Orden intencional: primero la contrasena, despues el estado. Asi el mensaje
   * de cuenta desactivada nunca se muestra a quien no conoce la contrasena.
   */
  private async validarCredenciales(datos: LoginDto): Promise<Usuario> {
    // El bloqueo se comprueba antes de tocar la contrasena: mientras dure, da
    // igual si es correcta o no.
    const bloqueoVigente = await this.intentos.segundosRestantes(datos.correo);
    if (bloqueoVigente !== null) {
      throw this.errorDemasiadosIntentos(bloqueoVigente);
    }

    const usuario = await this.usuarios.buscarParaAutenticar(datos.correo);

    if (!usuario) {
      await bcrypt.compare(datos.contrasena, HASH_SENUELO);
      // Tambien se cuentan los intentos contra correos inexistentes. Si solo se
      // contaran los de cuentas reales, el mensaje de bloqueo delataria que ese
      // correo esta registrado.
      throw await this.errorPorFallo(datos.correo);
    }

    const contrasenaCorrecta = await bcrypt.compare(
      datos.contrasena,
      usuario.contrasenaHash,
    );
    if (!contrasenaCorrecta) {
      throw await this.errorPorFallo(datos.correo);
    }

    // La contrasena era correcta: el contador se reinicia aunque la cuenta
    // resulte estar desactivada, porque quien la conoce no es un atacante.
    await this.intentos.limpiar(datos.correo);

    // Criterio de aceptacion: un usuario inactivo no puede iniciar sesion.
    if (!usuario.activo) {
      throw new ForbiddenException(
        'Esta cuenta esta desactivada. Comuniquese con el administrador del sistema.',
      );
    }

    return usuario;
  }

  /**
   * Registra el fallo y devuelve el error que corresponde lanzar: el de bloqueo
   * si este intento agoto los disponibles, o el generico de credenciales.
   *
   * Devuelve el error en vez de lanzarlo para que el `throw` quede a la vista
   * en quien la llama; asi TypeScript puede estrechar los tipos despues del
   * bloque, cosa que no hace con un metodo async que nunca retorna.
   */
  private async errorPorFallo(correo: string): Promise<HttpException> {
    const segundos = await this.intentos.registrarFallo(correo);
    if (segundos !== null) {
      return this.errorDemasiadosIntentos(segundos);
    }
    return new UnauthorizedException(CREDENCIALES_INVALIDAS);
  }

  /**
   * Ademas del mensaje legible, la respuesta lleva `segundosRestantes` para que
   * la interfaz pueda mostrar una cuenta regresiva sin tener que interpretar el
   * texto del mensaje.
   */
  private errorDemasiadosIntentos(segundos: number): HttpException {
    const minutos = Math.ceil(segundos / 60);
    return new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `Demasiados intentos fallidos. Intente de nuevo en ${minutos} ${
          minutos === 1 ? 'minuto' : 'minutos'
        }.`,
        segundosRestantes: segundos,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /**
   * Tasks: "Crear servicio de autenticacion" y "Generar token o sesion de acceso".
   * El token se entrega al controlador para Set-Cookie; no se expone en el JSON.
   */
  async login(datos: LoginDto): Promise<ResultadoLogin> {
    const usuario = await this.validarCredenciales(datos);
    const sesion = await this.emitirSesion(usuario);
    await this.usuarios.registrarUltimoAcceso(usuario.id);
    return sesion;
  }

  /**
   * El titular actualiza su nombre y correo. El JWT se vuelve a firmar para
   * que la cookie de sesión coincida con los datos nuevos.
   */
  async actualizarPerfil(
    actor: UsuarioAutenticado,
    dto: ActualizarPerfilDto,
  ): Promise<ResultadoLogin> {
    const actualizado = await this.usuarios.actualizarPerfilPropio(actor.id, {
      nombre: dto.nombre,
      correo: dto.correo,
    });

    return this.emitirSesion(actualizado);
  }

  async cambiarContrasena(
    actor: UsuarioAutenticado,
    dto: CambiarContrasenaDto,
  ): Promise<{ ok: true }> {
    const usuario = await this.usuarios.buscarParaAutenticarPorId(actor.id);

    if (!usuario) {
      throw new UnauthorizedException('La sesión ya no es válida.');
    }

    const actualCorrecta = await bcrypt.compare(
      dto.contrasenaActual,
      usuario.contrasenaHash,
    );
    if (!actualCorrecta) {
      throw new UnauthorizedException('La contraseña actual no es correcta.');
    }

    if (dto.contrasenaNueva === dto.contrasenaActual) {
      throw new BadRequestException(
        'La nueva contraseña debe ser distinta a la actual.',
      );
    }

    await this.usuarios.reemplazarContrasena(
      usuario.id,
      await bcrypt.hash(dto.contrasenaNueva, 12),
    );

    return { ok: true };
  }

  /**
   * Siempre responde ok para no revelar si el correo existe.
   * Si la cuenta está activa, envía un enlace de un solo uso (1 hora).
   */
  async solicitarRestablecimiento(
    dto: SolicitarRestablecimientoDto,
  ): Promise<{ ok: true; mensaje: string }> {
    const mensaje =
      'Si el correo está registrado, enviamos instrucciones para restablecer la contraseña.';

    const usuario = await this.usuarios.buscarParaAutenticar(dto.correo);
    if (!usuario?.activo) {
      return { ok: true, mensaje };
    }

    await this.tokensRestablecer.delete({
      usuarioId: usuario.id,
      usadoEn: IsNull(),
    });

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashearTokenRestablecer(token);
    const expiraEn = new Date(Date.now() + VIDA_TOKEN_RESTABLECER_MS);

    await this.tokensRestablecer.save(
      this.tokensRestablecer.create({
        usuarioId: usuario.id,
        tokenHash,
        expiraEn,
        usadoEn: null,
      }),
    );

    const base =
      this.config.get<string>('FRONTEND_URL')?.replace(/\/$/, '') ??
      obtenerOrigenesPermitidos((k) => this.config.get<string>(k))[0];
    const enlace = `${base}/restablecer-contrasena?token=${token}`;

    try {
      await this.mail.enviarCorreo({
        destinatario: usuario.correo,
        asunto: 'Restablecer contraseña — Gestión CTP 27',
        html: `
          <p>Hola ${usuario.nombre},</p>
          <p>Recibimos una solicitud para restablecer la contraseña de su cuenta.</p>
          <p><a href="${enlace}">Restablecer contraseña</a></p>
          <p>El enlace vence en 1 hora. Si usted no pidió este cambio, ignore este correo.</p>
        `,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el correo de restablecimiento a ${usuario.correo}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return { ok: true, mensaje };
  }

  async restablecerContrasena(
    dto: RestablecerContrasenaDto,
  ): Promise<{ ok: true }> {
    const tokenHash = this.hashearTokenRestablecer(dto.token.trim());
    const registro = await this.tokensRestablecer.findOne({
      where: {
        tokenHash,
        usadoEn: IsNull(),
        expiraEn: MoreThan(new Date()),
      },
    });

    if (!registro) {
      throw new BadRequestException(
        'El enlace no es válido o ya expiró. Solicite uno nuevo.',
      );
    }

    const usuario = await this.usuarios.buscarPorId(registro.usuarioId);
    if (!usuario?.activo) {
      throw new BadRequestException(
        'El enlace no es válido o ya expiró. Solicite uno nuevo.',
      );
    }

    await this.usuarios.reemplazarContrasena(
      usuario.id,
      await bcrypt.hash(dto.contrasenaNueva, 12),
    );

    registro.usadoEn = new Date();
    await this.tokensRestablecer.save(registro);
    await this.tokensRestablecer.delete({
      usuarioId: usuario.id,
      usadoEn: IsNull(),
    });
    await this.intentos.limpiar(usuario.correo);

    return { ok: true };
  }

  private hashearTokenRestablecer(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async emitirSesion(usuario: {
    id: string;
    nombre: string;
    correo: string;
    rol: Usuario['rol'];
  }): Promise<ResultadoLogin> {
    const payload: JwtPayload = {
      sub: usuario.id,
      correo: usuario.correo,
      nombre: usuario.nombre,
      rol: usuario.rol,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      expiraEn: this.config.get<string>('JWT_EXPIRACION', '1h'),
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    };
  }

  opcionesParaSetCookie() {
    return opcionesSetCookie(this.opcionesCookie);
  }

  opcionesParaClearCookie() {
    return opcionesClearCookie(this.opcionesCookie);
  }

  /** Reutilizable por el Backlog 1.2 al registrar usuarios. */
  hashearContrasena(contrasenaPlana: string): Promise<string> {
    return bcrypt.hash(contrasenaPlana, 12);
  }
}
