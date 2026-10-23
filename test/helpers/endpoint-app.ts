/* eslint-disable @typescript-eslint/no-unsafe-argument -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  Injectable,
  Provider,
  Type,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD, APP_PIPE, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CLAVE_PUBLICO } from '../../src/modules/auth/decorators/publico.decorator';
import { ModuloSistema } from '../../src/modules/auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../src/modules/auth/enums/nivel-permiso.enum';
import { PermisosGuard } from '../../src/modules/auth/guards/permisos.guard';
import { RolesGuard } from '../../src/modules/auth/guards/roles.guard';
import { PermisosService } from '../../src/modules/auth/permisos.service';
import type {
  SolicitudAutenticada,
  UsuarioAutenticado,
} from '../../src/modules/auth/tipos/jwt-payload';
import { RolUsuario } from '../../src/modules/usuarios/enums/rol-usuario.enum';

/** Cabecera con la que cada prueba elige el rol de la "sesión". */
export const CABECERA_ROL = 'x-test-rol';

const { ADMINISTRADOR, DIRECTORA, DOCENTE_PECUARIO, DOCENTE_AGRICOLA } =
  RolUsuario;
const { COMPLETO, LECTURA, NINGUNO } = NivelPermiso;

/**
 * Matriz efectiva de permisos: la sembrada en la migración 1786700000000, más
 * LIBRO_CAJA (1794000000000) y el ajuste de REPORTES para docentes
 * (1814000000000). Se replica aquí para ejercitar el PermisosGuard real sin BD.
 */
export const MATRIZ_PERMISOS: Record<
  RolUsuario,
  Record<ModuloSistema, NivelPermiso>
> = {
  [ADMINISTRADOR]: {
    PANEL: COMPLETO,
    USUARIOS: COMPLETO,
    PECUARIA: COMPLETO,
    AGRICOLA: COMPLETO,
    INVENTARIO: COMPLETO,
    LIBRO_CAJA: COMPLETO,
    REPORTES: COMPLETO,
  },
  [DIRECTORA]: {
    PANEL: LECTURA,
    USUARIOS: NINGUNO,
    PECUARIA: LECTURA,
    AGRICOLA: LECTURA,
    INVENTARIO: LECTURA,
    LIBRO_CAJA: LECTURA,
    REPORTES: LECTURA,
  },
  [DOCENTE_PECUARIO]: {
    PANEL: LECTURA,
    USUARIOS: NINGUNO,
    PECUARIA: COMPLETO,
    AGRICOLA: NINGUNO,
    INVENTARIO: COMPLETO,
    LIBRO_CAJA: COMPLETO,
    REPORTES: COMPLETO,
  },
  [DOCENTE_AGRICOLA]: {
    PANEL: LECTURA,
    USUARIOS: NINGUNO,
    PECUARIA: NINGUNO,
    AGRICOLA: COMPLETO,
    INVENTARIO: COMPLETO,
    LIBRO_CAJA: COMPLETO,
    REPORTES: COMPLETO,
  },
  [RolUsuario.ESTUDIANTE]: {
    PANEL: LECTURA,
    USUARIOS: NINGUNO,
    PECUARIA: LECTURA,
    AGRICOLA: LECTURA,
    INVENTARIO: LECTURA,
    LIBRO_CAJA: NINGUNO,
    REPORTES: NINGUNO,
  },
};

/** Reemplazo de PermisosService que lee la matriz anterior en vez de la BD. */
export const permisosDePrueba = {
  matrizDe: (rol: RolUsuario) => Promise.resolve(MATRIZ_PERMISOS[rol]),
  nivelDe: (rol: RolUsuario, modulo: ModuloSistema) =>
    Promise.resolve(MATRIZ_PERMISOS[rol][modulo]),
  puede: (rol: RolUsuario, modulo: ModuloSistema, requerido: NivelPermiso) => {
    const orden = [NINGUNO, LECTURA, COMPLETO];
    return Promise.resolve(
      orden.indexOf(MATRIZ_PERMISOS[rol][modulo]) >= orden.indexOf(requerido),
    );
  },
};

/**
 * Sustituto de JwtAuthGuard: respeta @Publico() y, si no, toma el rol de la
 * cabecera `x-test-rol`. Sin cabecera responde 401, igual que el guard real.
 */
@Injectable()
class AutenticacionDePrueba implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const esPublico = this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (esPublico) return true;

    const solicitud = context
      .switchToHttp()
      .getRequest<SolicitudAutenticada & { headers: Record<string, string> }>();
    const rol = solicitud.headers[CABECERA_ROL] as RolUsuario | undefined;
    if (!rol) throw new UnauthorizedException('Unauthorized');

    solicitud.user = usuarioDePrueba(rol);
    return true;
  }
}

export function usuarioDePrueba(rol: RolUsuario): UsuarioAutenticado {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    correo: `${rol.toLowerCase()}@ctp27.test`,
    nombre: `Usuario ${rol}`,
    rol,
  };
}

export interface OpcionesApp {
  controllers: Type<unknown>[];
  /** Servicios simulados (y cualquier otro provider que el controller inyecte). */
  providers?: Provider[];
}

/**
 * Levanta una app Nest con los mismos pipe y guards globales que AppModule
 * (ValidationPipe estricto, RolesGuard, PermisosGuard) pero sin BD ni JWT.
 * Así cada prueba valida la ruta real: verbo, path, pipes, DTO y permisos.
 */
export async function crearAppDePrueba(
  opciones: OpcionesApp,
): Promise<INestApplication> {
  const modulo = await Test.createTestingModule({
    controllers: opciones.controllers,
    providers: [
      ...(opciones.providers ?? []),
      { provide: PermisosService, useValue: permisosDePrueba },
      {
        provide: APP_PIPE,
        useValue: new ValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
      },
      { provide: APP_GUARD, useClass: AutenticacionDePrueba },
      { provide: APP_GUARD, useClass: RolesGuard },
      { provide: APP_GUARD, useClass: PermisosGuard },
    ],
  }).compile();

  const app = modulo.createNestApplication();
  await app.init();
  // Escucha una sola vez en un puerto efímero: así supertest reutiliza el
  // servidor en vez de abrirlo y cerrarlo en cada petición (fuente de
  // timeouts intermitentes bajo carga o con --coverage).
  await app.listen(0, '127.0.0.1');
  return app;
}

/** Servicio simulado: cada método listado es un jest.fn() sin implementación. */
export function servicioSimulado<T extends string>(
  ...metodos: T[]
): Record<T, jest.Mock> {
  return Object.fromEntries(metodos.map((m) => [m, jest.fn()])) as Record<
    T,
    jest.Mock
  >;
}

type Metodo = 'get' | 'post' | 'put' | 'patch' | 'delete';

/** Petición HTTP a la app de prueba, con sesión del rol indicado (o sin ella). */
export function llamar(
  app: INestApplication,
  metodo: Metodo,
  ruta: string,
  rol?: RolUsuario,
) {
  const peticion = request(app.getHttpServer())[metodo](ruta);
  return rol ? peticion.set(CABECERA_ROL, rol) : peticion;
}

/** Roles que reciben 2xx/4xx de negocio (no 401/403) en un módulo y nivel. */
export function rolesCon(
  modulo: ModuloSistema,
  nivel: NivelPermiso,
): RolUsuario[] {
  const orden = [NINGUNO, LECTURA, COMPLETO];
  return Object.values(RolUsuario).filter(
    (rol) =>
      orden.indexOf(MATRIZ_PERMISOS[rol][modulo]) >= orden.indexOf(nivel),
  );
}

/** Roles que el guard debe rechazar con 403 en ese módulo y nivel. */
export function rolesSin(
  modulo: ModuloSistema,
  nivel: NivelPermiso,
): RolUsuario[] {
  const con = rolesCon(modulo, nivel);
  return Object.values(RolUsuario).filter((rol) => !con.includes(rol));
}
