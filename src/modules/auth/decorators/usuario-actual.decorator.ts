import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type {
  SolicitudAutenticada,
  UsuarioAutenticado,
} from '../tipos/jwt-payload';

/** Inyecta el usuario autenticado en el metodo del controlador. */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    const solicitud = ctx.switchToHttp().getRequest<SolicitudAutenticada>();

    // El guard JWT global se ejecuta antes que este decorador en todas las
    // rutas privadas, por lo que Passport ya agregó el usuario.
    return solicitud.user!;
  },
);
