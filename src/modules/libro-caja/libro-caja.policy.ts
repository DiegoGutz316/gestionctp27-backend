import { ForbiddenException, Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';
import { RolUsuario } from '../usuarios/enums/rol-usuario.enum';

@Injectable()
export class LibroCajaPolicy {
  exigirAdministrador(actor: UsuarioAutenticado): void {
    if (actor.rol !== RolUsuario.ADMINISTRADOR) {
      throw new ForbiddenException(
        'Solo un administrador puede modificar la información del colegio, los departamentos o los periodos.',
      );
    }
  }

  exigirSolicitudFondo(actor: UsuarioAutenticado): void {
    if (actor.rol === RolUsuario.ADMINISTRADOR) return;
    if (
      actor.rol === RolUsuario.DOCENTE_AGRICOLA ||
      actor.rol === RolUsuario.DOCENTE_PECUARIO
    ) {
      return;
    }
    throw new ForbiddenException(
      'No puede solicitar el fondo de caja de este departamento.',
    );
  }
}
