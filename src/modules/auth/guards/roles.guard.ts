import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CLAVE_ROLES } from '../decorators/roles.decorator';
import type { RolUsuario } from '../../../schemas';
import type { UsuarioAutenticado } from '../tipos/jwt-payload';

/**
 * Autorizacion por rol. Base del Backlog 1.6: el backend bloquea la accion
 * aunque el frontend haya ocultado la opcion del menu.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesPermitidos = this.reflector.getAllAndOverride<RolUsuario[]>(
      CLAVE_ROLES,
      [context.getHandler(), context.getClass()],
    );

    // Sin @Roles() el endpoint solo exige estar autenticado.
    if (!rolesPermitidos?.length) return true;

    const usuario: UsuarioAutenticado | undefined =
      context.switchToHttp().getRequest().user;

    if (!usuario || !rolesPermitidos.includes(usuario.rol)) {
      throw new ForbiddenException(
        'No tiene permisos para realizar esta accion.',
      );
    }

    return true;
  }
}
