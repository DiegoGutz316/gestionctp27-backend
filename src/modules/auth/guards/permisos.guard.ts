import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  CLAVE_PERMISO,
  type PermisoRequerido,
} from '../decorators/requiere-permiso.decorator';
import { ETIQUETA_MODULO } from '../enums/modulo-sistema.enum';
import { PermisosService } from '../permisos.service';
import type { SolicitudAutenticada } from '../tipos/jwt-payload';

/**
 * Backlog 1.6 - Tasks: "Validar permisos antes de ejecutar acciones" y
 * "Crear middleware o guard de autorizacion".
 *
 * Complementa a RolesGuard (que compara contra una lista fija de roles):
 * aqui el permiso se resuelve contra la matriz `permisos_rol` de la BD, asi que
 * se puede reajustar el acceso de un rol sin recompilar.
 *
 * Registrado como guard global en AppModule. Un endpoint sin @RequierePermiso
 * solo exige estar autenticado, igual que antes de este backlog.
 */
@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permisos: PermisosService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requerido = this.reflector.getAllAndOverride<PermisoRequerido>(
      CLAVE_PERMISO,
      [context.getHandler(), context.getClass()],
    );

    if (!requerido) return true;

    const solicitud = context.switchToHttp().getRequest<SolicitudAutenticada>();
    const usuario = solicitud.user;

    // Sin usuario en la solicitud no hay rol que evaluar. JwtAuthGuard ya
    // deberia haber respondido 401; se deniega igual por si el orden de guards
    // cambia en el futuro.
    if (!usuario) {
      throw new ForbiddenException(
        'No tiene permisos para realizar esta acción.',
      );
    }

    const autorizado = await this.permisos.puede(
      usuario.rol,
      requerido.modulo,
      requerido.nivel,
    );

    if (!autorizado) {
      throw new ForbiddenException(
        `Su rol no tiene acceso a ${ETIQUETA_MODULO[requerido.modulo]}.`,
      );
    }

    return true;
  }
}
