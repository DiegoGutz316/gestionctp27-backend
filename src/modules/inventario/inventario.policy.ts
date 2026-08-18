import { ForbiddenException, Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';
import { RolUsuario } from '../usuarios/enums/rol-usuario.enum';
import { Departamento } from './producto/enums/departamento.enum';

export function departamentoDocente(rol: RolUsuario): Departamento | undefined {
  if (rol === RolUsuario.DOCENTE_AGRICOLA) return Departamento.AGRICOLA;
  if (rol === RolUsuario.DOCENTE_PECUARIO) return Departamento.PECUARIO;
  return undefined;
}

@Injectable()
export class InventarioPolicy {
  exigirAdministrador(actor: UsuarioAutenticado): void {
    if (actor.rol !== RolUsuario.ADMINISTRADOR) {
      throw new ForbiddenException(
        'Solo un administrador puede modificar productos o configuraciones de stock.',
      );
    }
  }

  exigirMovimiento(
    actor: UsuarioAutenticado,
    departamento: Departamento,
  ): void {
    if (actor.rol === RolUsuario.ADMINISTRADOR) return;
    const permitido = departamentoDocente(actor.rol);
    if (!permitido || permitido !== departamento) {
      throw new ForbiddenException(
        'No puede registrar movimientos para este departamento.',
      );
    }
  }

  exigirLectura(actor: UsuarioAutenticado, departamento: Departamento): void {
    const permitido = departamentoDocente(actor.rol);
    if (permitido && permitido !== departamento) {
      throw new ForbiddenException(
        'No puede consultar inventario de otro departamento.',
      );
    }
  }

  limitarDepartamento(actor: UsuarioAutenticado): Departamento | undefined {
    return departamentoDocente(actor.rol);
  }
}
