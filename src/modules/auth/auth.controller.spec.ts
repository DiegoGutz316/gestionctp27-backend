/**
 * Pruebas de endpoints - AuthController
 *
 * Endpoints cubiertos:
 *   POST /auth/login     (público, 200, cookie httpOnly)
 *   POST /auth/logout    (público, 200, limpia cookie)
 *   GET  /auth/perfil    (autenticado)
 *   PATCH /auth/perfil   (autenticado)
 *   PATCH /auth/perfil/contrasena (autenticado)
 *   GET  /auth/permisos  (autenticado)
 *
 * Se monta el controller real con ValidationPipe estricto y el AuthService
 * simulado; no se usa BD ni JWT.
 */
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import {
  crearAppDePrueba,
  llamar,
  MATRIZ_PERMISOS,
  servicioSimulado,
  usuarioDePrueba,
} from '../../../test/helpers/endpoint-app';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { NOMBRE_COOKIE_ACCESO } from './constantes/cookie-auth';
import { RolUsuario } from '../usuarios/enums/rol-usuario.enum';

describe('AuthController (endpoints)', () => {
  let app: INestApplication;
  const auth = {
    ...servicioSimulado(
      'login',
      'actualizarPerfil',
      'cambiarContrasena',
      'opcionesParaSetCookie',
      'opcionesParaClearCookie',
    ),
  };

  beforeAll(async () => {
    app = await crearAppDePrueba({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: auth }],
    });
  });

  afterAll(() => app.close());

  beforeEach(() => {
    jest.resetAllMocks();
    auth.opcionesParaSetCookie.mockReturnValue({ httpOnly: true, path: '/' });
    auth.opcionesParaClearCookie.mockReturnValue({ httpOnly: true, path: '/' });
  });

  describe('POST /auth/login', () => {
    const credenciales = {
      correo: ' Admin@CTP27.test ',
      contrasena: 'Secreta1',
    };

    it('200: devuelve usuario y expiración, el token solo viaja en cookie httpOnly', async () => {
      const usuario = usuarioDePrueba(RolUsuario.ADMINISTRADOR);
      auth.login.mockResolvedValue({
        accessToken: 'jwt-firmado',
        expiraEn: 3600,
        usuario,
      });

      const res = await llamar(app, 'post', '/auth/login').send(credenciales);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ expiraEn: 3600, usuario });
      expect(JSON.stringify(res.body)).not.toContain('jwt-firmado');
      const cookie = (res.headers['set-cookie'] as unknown as string[])[0];
      expect(cookie).toContain(`${NOMBRE_COOKIE_ACCESO}=jwt-firmado`);
      expect(cookie).toContain('HttpOnly');
    });

    it('normaliza el correo (trim + minúsculas) antes de llamar al servicio', async () => {
      auth.login.mockResolvedValue({
        accessToken: 't',
        expiraEn: 1,
        usuario: {},
      });

      await llamar(app, 'post', '/auth/login').send(credenciales);

      expect(auth.login).toHaveBeenCalledWith(
        expect.objectContaining({ correo: 'admin@ctp27.test' }),
      );
    });

    it.each([
      [
        'correo con formato inválido',
        { correo: 'no-es-correo', contrasena: 'x' },
      ],
      ['correo vacío', { correo: '', contrasena: 'x' }],
      ['contraseña vacía', { correo: 'a@b.cr', contrasena: '' }],
      [
        'contraseña > 72 caracteres',
        { correo: 'a@b.cr', contrasena: 'x'.repeat(73) },
      ],
      [
        'campos desconocidos (forbidNonWhitelisted)',
        { correo: 'a@b.cr', contrasena: 'x', rol: 'ADMINISTRADOR' },
      ],
      ['cuerpo vacío', {}],
    ])('400: rechaza %s sin llamar al servicio', async (_caso, cuerpo) => {
      const res = await llamar(app, 'post', '/auth/login').send(cuerpo);

      expect(res.status).toBe(400);
      expect(auth.login).not.toHaveBeenCalled();
    });

    it('propaga el error de credenciales del servicio y no emite cookie', async () => {
      auth.login.mockRejectedValue(new UnauthorizedException('credenciales'));

      const res = await llamar(app, 'post', '/auth/login').send({
        correo: 'a@b.cr',
        contrasena: 'mala',
      });

      expect(res.status).toBe(401);
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('es público: no exige sesión', async () => {
      auth.login.mockResolvedValue({
        accessToken: 't',
        expiraEn: 1,
        usuario: {},
      });
      const res = await llamar(app, 'post', '/auth/login').send({
        correo: 'a@b.cr',
        contrasena: 'x',
      });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /auth/logout', () => {
    it('200: responde { ok: true } y expira la cookie de sesión', async () => {
      const res = await llamar(app, 'post', '/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      const cookie = (res.headers['set-cookie'] as unknown as string[])[0];
      expect(cookie).toContain(`${NOMBRE_COOKIE_ACCESO}=;`);
      expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/);
    });
  });

  describe('GET /auth/perfil', () => {
    it('401: sin sesión', async () => {
      expect((await llamar(app, 'get', '/auth/perfil')).status).toBe(401);
    });

    it.each(Object.values(RolUsuario))(
      '200: devuelve el usuario de la sesión (%s)',
      async (rol) => {
        const res = await llamar(app, 'get', '/auth/perfil', rol);

        expect(res.status).toBe(200);
        expect(res.body).toEqual(usuarioDePrueba(rol));
      },
    );
  });

  describe('PATCH /auth/perfil', () => {
    const datos = { nombre: 'Ana Mora', correo: 'ana@ctp27.test' };

    it('401: sin sesión', async () => {
      expect((await llamar(app, 'patch', '/auth/perfil').send(datos)).status).toBe(
        401,
      );
    });

    it('200: devuelve el usuario actualizado y renueva la cookie', async () => {
      const usuario = usuarioDePrueba(RolUsuario.ADMINISTRADOR);
      auth.actualizarPerfil.mockResolvedValue({
        accessToken: 'jwt-nuevo',
        expiraEn: '8h',
        usuario: { ...usuario, nombre: datos.nombre, correo: datos.correo },
      });

      const res = await llamar(
        app,
        'patch',
        '/auth/perfil',
        RolUsuario.ADMINISTRADOR,
      ).send(datos);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        ...usuario,
        nombre: datos.nombre,
        correo: datos.correo,
      });
      const cookie = (res.headers['set-cookie'] as unknown as string[])[0];
      expect(cookie).toContain(`${NOMBRE_COOKIE_ACCESO}=jwt-nuevo`);
    });

    it('400: rechaza un correo inválido', async () => {
      const res = await llamar(
        app,
        'patch',
        '/auth/perfil',
        RolUsuario.DOCENTE_AGRICOLA,
      ).send({ nombre: 'Ana', correo: 'no-es-correo' });

      expect(res.status).toBe(400);
      expect(auth.actualizarPerfil).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /auth/perfil/contrasena', () => {
    const datos = {
      contrasenaActual: 'Actual123',
      contrasenaNueva: 'Nueva4567',
    };

    it('401: sin sesión', async () => {
      expect(
        (await llamar(app, 'patch', '/auth/perfil/contrasena').send(datos))
          .status,
      ).toBe(401);
    });

    it('200: cambia la contraseña', async () => {
      auth.cambiarContrasena.mockResolvedValue({ ok: true });

      const res = await llamar(
        app,
        'patch',
        '/auth/perfil/contrasena',
        RolUsuario.DOCENTE_PECUARIO,
      ).send(datos);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it('400: rechaza una contraseña nueva corta', async () => {
      const res = await llamar(
        app,
        'patch',
        '/auth/perfil/contrasena',
        RolUsuario.DOCENTE_PECUARIO,
      ).send({ contrasenaActual: 'Actual123', contrasenaNueva: 'corta' });

      expect(res.status).toBe(400);
      expect(auth.cambiarContrasena).not.toHaveBeenCalled();
    });
  });

  describe('GET /auth/permisos', () => {
    it('401: sin sesión', async () => {
      expect((await llamar(app, 'get', '/auth/permisos')).status).toBe(401);
    });

    it.each(Object.values(RolUsuario))(
      '200: devuelve la matriz del rol %s',
      async (rol) => {
        const res = await llamar(app, 'get', '/auth/permisos', rol);

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ rol, permisos: MATRIZ_PERMISOS[rol] });
      },
    );
  });
});
