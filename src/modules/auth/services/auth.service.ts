import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsuariosService } from '../../usuarios/services/usuarios.service';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import type { LoginDto } from '../dto/login.dto';
import type { JwtPayload } from '../tipos/jwt-payload';
import type { RespuestaLogin } from '../tipos/respuesta-login';

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
  constructor(
    private readonly usuarios: UsuariosService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Tasks: "Validar credenciales del usuario" y "Validar que el usuario este activo".
   *
   * Orden intencional: primero la contrasena, despues el estado. Asi el mensaje
   * de cuenta desactivada nunca se muestra a quien no conoce la contrasena.
   */
  private async validarCredenciales(datos: LoginDto): Promise<Usuario> {
    const usuario = await this.usuarios.buscarParaAutenticar(datos.correo);

    if (!usuario) {
      await bcrypt.compare(datos.contrasena, HASH_SENUELO);
      throw new UnauthorizedException(CREDENCIALES_INVALIDAS);
    }

    const contrasenaCorrecta = await bcrypt.compare(
      datos.contrasena,
      usuario.contrasenaHash,
    );
    if (!contrasenaCorrecta) {
      throw new UnauthorizedException(CREDENCIALES_INVALIDAS);
    }

    // Criterio de aceptacion: un usuario inactivo no puede iniciar sesion.
    if (!usuario.activo) {
      throw new ForbiddenException(
        'Esta cuenta esta desactivada. Comuniquese con el administrador del sistema.',
      );
    }

    return usuario;
  }

  /**
   * Tasks: "Crear servicio de autenticacion" y "Generar token o sesion de acceso".
   */
  async login(datos: LoginDto): Promise<RespuestaLogin> {
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

  /** Reutilizable por el Backlog 1.2 al registrar usuarios. */
  hashearContrasena(contrasenaPlana: string): Promise<string> {
    return bcrypt.hash(contrasenaPlana, 12);
  }
}
