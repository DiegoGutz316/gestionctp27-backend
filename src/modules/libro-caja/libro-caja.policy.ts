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
    if (this.esDocenteOAdministrador(actor)) return;
    throw new ForbiddenException(
      'No puede solicitar el fondo de caja de este departamento.',
    );
  }

  exigirRegistroAsiento(actor: UsuarioAutenticado): void {
    if (this.esDocenteOAdministrador(actor)) return;
    throw new ForbiddenException(
      'No puede registrar asientos en el libro de caja.',
    );
  }

  exigirGuardarPie(actor: UsuarioAutenticado): void {
    if (
      this.esDocenteOAdministrador(actor) ||
      actor.rol === RolUsuario.DIRECTORA
    ) {
      return;
    }
    throw new ForbiddenException(
      'No puede modificar el informe económico.',
    );
  }

  private esDocenteOAdministrador(actor: UsuarioAutenticado): boolean {
    return (
      actor.rol === RolUsuario.ADMINISTRADOR ||
      actor.rol === RolUsuario.DOCENTE_AGRICOLA ||
      actor.rol === RolUsuario.DOCENTE_PECUARIO
    );
  }
}
