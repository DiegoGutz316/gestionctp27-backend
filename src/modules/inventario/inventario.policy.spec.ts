import { ForbiddenException } from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';
import { RolUsuario } from '../usuarios/enums/rol-usuario.enum';
import { InventarioPolicy } from './inventario.policy';
import { Departamento } from './producto/enums/departamento.enum';

describe('InventarioPolicy', () => {
  const policy = new InventarioPolicy();
  const actor = (rol: RolUsuario) => ({ rol }) as UsuarioAutenticado;

  it('permite al docente agrícola mover solo AGRICOLA', () => {
    expect(() =>
      policy.exigirMovimiento(
        actor(RolUsuario.DOCENTE_AGRICOLA),
        Departamento.AGRICOLA,
      ),
    ).not.toThrow();
    expect(() =>
      policy.exigirMovimiento(
        actor(RolUsuario.DOCENTE_AGRICOLA),
        Departamento.GENERAL,
      ),
    ).toThrow(ForbiddenException);
  });

  it('reserva productos y configuraciones al administrador', () => {
    expect(() =>
      policy.exigirAdministrador(actor(RolUsuario.DIRECTORA)),
    ).toThrow(ForbiddenException);
    expect(() =>
      policy.exigirAdministrador(actor(RolUsuario.ADMINISTRADOR)),
    ).not.toThrow();
  });
});
