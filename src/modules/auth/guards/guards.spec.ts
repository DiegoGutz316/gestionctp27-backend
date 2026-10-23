/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-member-access -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas unitarias - RolesGuard, JwtAuthGuard y decorador @UsuarioActual
 * (PermisosGuard ya tiene su propio comportamiento cubierto vía los specs de endpoints).
 */
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { CLAVE_PUBLICO, Publico } from '../decorators/publico.decorator';
import { Roles } from '../decorators/roles.decorator';
import { UsuarioActual } from '../decorators/usuario-actual.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

function contexto(
  clase: object,
  handler: () => void,
  user?: unknown,
): ExecutionContext {
  return {
    getClass: () => clase,
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  class SinRoles {
    handler() {}
  }
  class SoloAdmin {
    @Roles(RolUsuario.ADMINISTRADOR)
    handler() {}
  }
  class Mixto {
    @Roles(RolUsuario.DIRECTORA, RolUsuario.ADMINISTRADOR)
    handler() {}
  }
  const ctx = (c: new () => { handler(): void }, user?: unknown) =>
    contexto(c, c.prototype.handler as () => void, user);

  it('sin @Roles: deja pasar (solo exige estar autenticado)', () => {
    expect(guard.canActivate(ctx(SinRoles))).toBe(true);
  });

  it('rol permitido: pasa', () => {
    expect(
      guard.canActivate(ctx(SoloAdmin, { rol: RolUsuario.ADMINISTRADOR })),
    ).toBe(true);
    expect(guard.canActivate(ctx(Mixto, { rol: RolUsuario.DIRECTORA }))).toBe(
      true,
    );
  });

  it.each([
    RolUsuario.DIRECTORA,
    RolUsuario.ESTUDIANTE,
    RolUsuario.DOCENTE_AGRICOLA,
  ])('rol %s no permitido: 403', (rol) => {
    expect(() => guard.canActivate(ctx(SoloAdmin, { rol }))).toThrow(
      ForbiddenException,
    );
  });

  it('sin usuario en la solicitud: 403', () => {
    expect(() => guard.canActivate(ctx(SoloAdmin))).toThrow(ForbiddenException);
  });
});

describe('JwtAuthGuard', () => {
  const guard = new JwtAuthGuard(new Reflector());

  class Privada {
    handler() {}
  }
  class PublicaPorMetodo {
    @Publico()
    handler() {}
  }
  @Publico()
  class PublicaPorClase {
    handler() {}
  }

  it('@Publico() en el método: no exige token', () => {
    const c = PublicaPorMetodo;
    expect(guard.canActivate(contexto(c, c.prototype.handler))).toBe(true);
  });

  it('@Publico() en la clase: no exige token', () => {
    const c = PublicaPorClase;
    expect(guard.canActivate(contexto(c, c.prototype.handler))).toBe(true);
  });

  it('ruta privada: delega en la estrategia JWT de passport (no la salta)', () => {
    const c = Privada;
    const base = Object.getPrototypeOf(JwtAuthGuard.prototype) as {
      canActivate: () => unknown;
    };
    const espia = jest.spyOn(base, 'canActivate').mockReturnValue('delegado');

    expect(guard.canActivate(contexto(c, c.prototype.handler))).toBe(
      'delegado',
    );
    expect(espia).toHaveBeenCalledTimes(1);

    espia.mockRestore();
  });

  it('el decorador @Publico marca la metadata esperada', () => {
    expect(
      Reflect.getMetadata(CLAVE_PUBLICO, PublicaPorMetodo.prototype.handler),
    ).toBe(true);
  });
});

describe('@UsuarioActual', () => {
  class Controlador {
    metodo(@UsuarioActual() _usuario: unknown) {}
  }
  const factory = Object.values(
    Reflect.getMetadata(ROUTE_ARGS_METADATA, Controlador, 'metodo') as Record<
      string,
      { factory: (d: unknown, c: ExecutionContext) => unknown }
    >,
  )[0].factory;

  it('devuelve request.user', () => {
    const usuario = { id: 'u1', rol: RolUsuario.ADMINISTRADOR };
    expect(
      factory(
        undefined,
        contexto({}, () => {}, usuario),
      ),
    ).toBe(usuario);
  });

  it('sin usuario: 401', () => {
    expect(() =>
      factory(
        undefined,
        contexto({}, () => {}),
      ),
    ).toThrow(UnauthorizedException);
  });
});
