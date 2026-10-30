/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument -- res.body y app.getHttpServer() de supertest son any */
/**
 * Pruebas de autenticación real (JwtStrategy + JwtAuthGuard + passport-jwt)
 *
 * Valida el mecanismo que protege TODOS los endpoints privados: el token se lee
 * de la cookie httpOnly (con Bearer como respaldo), se verifica firma y
 * expiración, y el usuario se vuelve a consultar en BD en cada petición para
 * que desactivaciones y cambios de rol surtan efecto de inmediato.
 *
 * Solo se simula UsuariosService (BD); firma, passport y guards son reales.
 */
import { Controller, Get, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { UsuariosService } from '../../usuarios/usuarios.service';
import { NOMBRE_COOKIE_ACCESO } from '../constantes/cookie-auth';
import { Publico } from '../decorators/publico.decorator';
import { UsuarioActual } from '../decorators/usuario-actual.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import type { UsuarioAutenticado } from '../tipos/jwt-payload';
import { JwtStrategy } from './jwt.strategy';

const SECRETO = 'secreto-de-prueba-para-jwt';

@Controller('prueba')
class ControladorDePrueba {
  @Get('privado')
  privado(@UsuarioActual() usuario: UsuarioAutenticado) {
    return usuario;
  }

  @Publico()
  @Get('publico')
  publico() {
    return { ok: true };
  }
}

describe('JwtStrategy + JwtAuthGuard (autenticación real)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const usuarios = { buscarPorId: jest.fn() };

  const payload = {
    sub: 'u-1',
    correo: 'ana@ctp27.test',
    nombre: 'Ana',
    rol: RolUsuario.ESTUDIANTE,
  };
  const enBd = (extra: Record<string, unknown> = {}) => ({
    id: 'u-1',
    correo: 'ana@ctp27.test',
    nombre: 'Ana',
    rol: RolUsuario.ESTUDIANTE,
    activo: true,
    contrasenaHash: 'no-debe-salir',
    ...extra,
  });

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: SECRETO,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [ControladorDePrueba],
      providers: [
        JwtStrategy,
        { provide: UsuariosService, useValue: usuarios },
        { provide: ConfigService, useValue: { getOrThrow: () => SECRETO } },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = modulo.createNestApplication();
    app.use(cookieParser());
    await app.init();
    await app.listen(0, '127.0.0.1');
    jwt = modulo.get(JwtService);
  });
  afterAll(() => app.close());
  beforeEach(() => {
    jest.resetAllMocks();
    usuarios.buscarPorId.mockResolvedValue(enBd());
  });

  const token = (extra: object = {}, opciones: object = {}) =>
    jwt.sign({ ...payload, ...extra }, opciones);
  const conCookie = (t: string) =>
    request(app.getHttpServer())
      .get('/prueba/privado')
      .set('Cookie', `${NOMBRE_COOKIE_ACCESO}=${t}`);
  const conBearer = (t: string) =>
    request(app.getHttpServer())
      .get('/prueba/privado')
      .set('Authorization', `Bearer ${t}`);

  it('token válido en cookie: 200 con el usuario (sin exponer el hash)', async () => {
    const res = await conCookie(token());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 'u-1',
      correo: 'ana@ctp27.test',
      nombre: 'Ana',
      rol: RolUsuario.ESTUDIANTE,
    });
    expect(usuarios.buscarPorId).toHaveBeenCalledWith('u-1');
  });

  it('token válido como Bearer (respaldo para Swagger): 200', async () => {
    expect((await conBearer(token())).status).toBe(200);
  });

  it('la cookie tiene prioridad sobre el Bearer', async () => {
    const res = await request(app.getHttpServer())
      .get('/prueba/privado')
      .set('Cookie', `${NOMBRE_COOKIE_ACCESO}=${token()}`)
      .set('Authorization', 'Bearer token-basura');
    expect(res.status).toBe(200);
  });

  it('sin token: 401', async () => {
    expect(
      (await request(app.getHttpServer()).get('/prueba/privado')).status,
    ).toBe(401);
    expect(usuarios.buscarPorId).not.toHaveBeenCalled();
  });

  it.each([
    ['token basura', () => 'abc.def.ghi'],
    [
      'firmado con otro secreto',
      () => new JwtService({ secret: 'otro' }).sign(payload),
    ],
    ['expirado', () => token({}, { expiresIn: '-10s' })],
  ])('401: %s', async (_c, generar) => {
    expect((await conCookie(generar())).status).toBe(401);
    expect(usuarios.buscarPorId).not.toHaveBeenCalled();
  });

  it('401: token sin firma (alg none)', async () => {
    const b64 = (o: object) =>
      Buffer.from(JSON.stringify(o)).toString('base64url');
    const sinFirma = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ ...payload, exp: 9999999999 })}.`;
    expect((await conBearer(sinFirma)).status).toBe(401);
  });

  it('401: el usuario ya no existe', async () => {
    usuarios.buscarPorId.mockResolvedValue(null);
    expect((await conCookie(token())).status).toBe(401);
  });

  it('401: usuario desactivado después de emitir el token (efecto inmediato)', async () => {
    usuarios.buscarPorId.mockResolvedValue(enBd({ activo: false }));
    const res = await conCookie(token());
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('La sesión ya no es válida.');
  });

  it('el rol se toma de la BD, no del token: un cambio de rol aplica de inmediato', async () => {
    usuarios.buscarPorId.mockResolvedValue(
      enBd({ rol: RolUsuario.ADMINISTRADOR }),
    );
    const res = await conCookie(token({ rol: RolUsuario.ESTUDIANTE }));
    expect(res.body.rol).toBe(RolUsuario.ADMINISTRADOR);
  });

  it('un rol falsificado dentro del token firmado no otorga privilegios', async () => {
    // El token trae ADMINISTRADOR pero la BD dice ESTUDIANTE.
    const res = await conCookie(token({ rol: RolUsuario.ADMINISTRADOR }));
    expect(res.body.rol).toBe(RolUsuario.ESTUDIANTE);
  });

  it('ruta @Publico: 200 sin token', async () => {
    expect(
      (await request(app.getHttpServer()).get('/prueba/publico')).status,
    ).toBe(200);
  });

  it('cookie vacía y sin Bearer: 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/prueba/privado')
      .set('Cookie', `${NOMBRE_COOKIE_ACCESO}=`);
    expect(res.status).toBe(401);
  });
});
