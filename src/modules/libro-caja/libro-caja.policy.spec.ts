import { ForbiddenException } from '@nestjs/common';
import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';
import { RolUsuario } from '../usuarios/enums/rol-usuario.enum';
import { LibroCajaPolicy } from './libro-caja.policy';

describe('LibroCajaPolicy', () => {
  const policy = new LibroCajaPolicy();
  const actor = (rol: RolUsuario) => ({ rol }) as UsuarioAutenticado;

  it('reserva colegio, departamentos y periodos al administrador', () => {
    expect(() =>
      policy.exigirAdministrador(actor(RolUsuario.DIRECTORA)),
    ).toThrow(ForbiddenException);
    expect(() =>
      policy.exigirAdministrador(actor(RolUsuario.DOCENTE_AGRICOLA)),
    ).toThrow(ForbiddenException);
    expect(() =>
      policy.exigirAdministrador(actor(RolUsuario.ADMINISTRADOR)),
    ).not.toThrow();
  });

  it('permite a docentes y al administrador solicitar fondos', () => {
    expect(() =>
      policy.exigirSolicitudFondo(actor(RolUsuario.DOCENTE_AGRICOLA)),
    ).not.toThrow();
    expect(() =>
      policy.exigirSolicitudFondo(actor(RolUsuario.DOCENTE_PECUARIO)),
    ).not.toThrow();
    expect(() =>
      policy.exigirSolicitudFondo(actor(RolUsuario.ADMINISTRADOR)),
    ).not.toThrow();
    expect(() =>
      policy.exigirSolicitudFondo(actor(RolUsuario.DIRECTORA)),
    ).toThrow(ForbiddenException);
  });
});
