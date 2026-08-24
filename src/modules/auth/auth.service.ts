import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsuariosService } from '../usuarios/usuarios.service';
import { IntentosLoginService } from './intentos-login.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import type { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './tipos/jwt-payload';
import type { ResultadoLogin } from './tipos/respuesta-login';
import {
  construirOpcionesCookie,
  opcionesClearCookie,
  opcionesSetCookie,
  type OpcionesCookieAuth,
} from './constantes/cookie-auth';

/**
 * Mensaje unico para correo inexistente y contrasena incorrecta.
 * Diferenciarlos permitiria averiguar que correos estan registrados.
 */
const CREDENCIALES_INVALIDAS = 'El correo o la contrasena no son correctos.';

/**
 * Hash valido de una contrasena que nadie conoce. Se compara contra el cuando
 * el correo no existe, para que la respuesta tarde lo mismo en ambos casos y
 * no se pueda deducir la existencia del usuario midiendo el tiempo.
 */
const HASH_SENUELO =
  '$2b$12$C6UzMDM.H6dfI/f/IKcEe.aH3vXH1n5Xn5s5b5o3P1u3Q6qL9K2Bu';

@Injectable()
export class AuthService {
  private readonly opcionesCookie: OpcionesCookieAuth;

  constructor(
    private readonly usuarios: UsuariosService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly intentos: IntentosLoginService,
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

    const payload: JwtPayload = {
      sub: usuario.id,
      correo: usuario.correo,
      nombre: usuario.nombre,
      rol: usuario.rol,
    };

    const accessToken = await this.jwt.signAsync(payload);
    await this.usuarios.registrarUltimoAcceso(usuario.id);

    return {
      accessToken,
      expiraEn: this.config.get<string>('JWT_EXPIRACION', '8h'),
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
