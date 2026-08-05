import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UsuariosService } from '../../usuarios/services/usuarios.service';
import type { JwtPayload, UsuarioAutenticado } from '../tipos/jwt-payload';

/**
 * Valida el token en cada peticion protegida.
 * Ademas de verificar la firma consulta la base, para que un usuario
 * desactivado (Backlog 1.5) o con rol cambiado (Backlog 1.6) vea el efecto de
 * inmediato, sin esperar a que venza el token.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usuarios: UsuariosService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<UsuarioAutenticado> {
    const usuario = await this.usuarios.buscarPorId(payload.sub);

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('La sesion ya no es valida.');
    }

    return {
      id: usuario.id,
      correo: usuario.correo,
      nombre: usuario.nombre,
      rol: usuario.rol,
    };
  }
}
