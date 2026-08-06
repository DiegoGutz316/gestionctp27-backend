import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  SolicitudAutenticada,
  UsuarioAutenticado,
} from '../tipos/jwt-payload';

/** Inyecta el usuario autenticado en el metodo del controlador. */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    const solicitud = ctx.switchToHttp().getRequest<SolicitudAutenticada>();
    const usuario = solicitud.user;

    if (!usuario) {
      throw new UnauthorizedException('Debe iniciar sesión para continuar.');
    }

    return usuario;
  },
);
