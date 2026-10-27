/**
 * Pruebas unitarias - AuthService (soporte de POST /auth/login)
 *
 * Dependencias simuladas: UsuariosService, JwtService, ConfigService e
 * IntentosLoginService. bcrypt se ejecuta de verdad (hash de costo bajo).
 */
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RolUsuario } from '../usuarios/enums/rol-usuario.enum';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const usuarios = {
    buscarParaAutenticar: jest.fn(),
    buscarParaAutenticarPorId: jest.fn(),
    registrarUltimoAcceso: jest.fn(),
    actualizarPerfilPropio: jest.fn(),
    reemplazarContrasena: jest.fn(),
  };
  const jwt = { signAsync: jest.fn() };
  const intentos = {
    segundosRestantes: jest.fn(),
    registrarFallo: jest.fn(),
    limpiar: jest.fn(),
  };
  const mail = { enviarCorreo: jest.fn() };
  const tokensRestablecer = {
    delete: jest.fn(),
    save: jest.fn(),
    create: jest.fn((v: unknown) => v),
    findOne: jest.fn(),
  };
  const entorno: Record<string, string | undefined> = {};
  const config = {
    get: jest.fn(
      (clave: string, defecto?: string) => entorno[clave] ?? defecto,
    ),
  };
  let servicio: AuthService;
  let hash: string;

  const usuario = (extra: Record<string, unknown> = {}) => ({
    id: 'u-1',
    nombre: 'Ana',
    correo: 'ana@ctp27.test',
    rol: RolUsuario.DOCENTE_AGRICOLA,
    activo: true,
    contrasenaHash: hash,
    ...extra,
  });
  const credenciales = { correo: 'ana@ctp27.test', contrasena: 'Correcta1' };

  beforeAll(async () => {
    hash = await bcrypt.hash('Correcta1', 4);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    config.get.mockImplementation(
      (clave: string, defecto?: string) => entorno[clave] ?? defecto,
    );
    for (const clave of Object.keys(entorno)) delete entorno[clave];
    intentos.segundosRestantes.mockResolvedValue(null);
    intentos.registrarFallo.mockResolvedValue(null);
    jwt.signAsync.mockResolvedValue('jwt-firmado');
    mail.enviarCorreo.mockResolvedValue(undefined);
    tokensRestablecer.delete.mockResolvedValue(undefined);
    tokensRestablecer.save.mockImplementation(async (v: unknown) => v);
    servicio = new AuthService(
      usuarios as never,
      jwt as never,
      config as never,
      intentos as never,
      mail as never,
      tokensRestablecer as never,
    );
  });

  describe('login', () => {
    it('credenciales válidas: firma el JWT con el payload esperado y devuelve la sesión', async () => {
      usuarios.buscarParaAutenticar.mockResolvedValue(usuario());

      const r = await servicio.login(credenciales);

      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: 'u-1',
        correo: 'ana@ctp27.test',
        nombre: 'Ana',
        rol: RolUsuario.DOCENTE_AGRICOLA,
      });
      expect(r).toEqual({
        accessToken: 'jwt-firmado',
        expiraEn: '1h',
        usuario: {
          id: 'u-1',
          nombre: 'Ana',
          correo: 'ana@ctp27.test',
          rol: RolUsuario.DOCENTE_AGRICOLA,
        },
      });
      expect(JSON.stringify(r.usuario)).not.toContain('contrasena');
    });

    it('usa JWT_EXPIRACION cuando está configurada', async () => {
      entorno.JWT_EXPIRACION = '30m';
      usuarios.buscarParaAutenticar.mockResolvedValue(usuario());
      expect((await servicio.login(credenciales)).expiraEn).toBe('30m');
    });

    it('éxito: reinicia el contador de intentos y registra el último acceso', async () => {
      usuarios.buscarParaAutenticar.mockResolvedValue(usuario());
      await servicio.login(credenciales);
      expect(intentos.limpiar).toHaveBeenCalledWith('ana@ctp27.test');
      expect(usuarios.registrarUltimoAcceso).toHaveBeenCalledWith('u-1');
    });

    it('contraseña incorrecta: 401 con mensaje genérico y cuenta el fallo', async () => {
      usuarios.buscarParaAutenticar.mockResolvedValue(usuario());

      await expect(
        servicio.login({ ...credenciales, contrasena: 'mala' }),
      ).rejects.toThrow(
        new UnauthorizedException(
          'El correo o la contrasena no son correctos.',
        ),
      );
      expect(intentos.registrarFallo).toHaveBeenCalledWith('ana@ctp27.test');
      expect(jwt.signAsync).not.toHaveBeenCalled();
      expect(usuarios.registrarUltimoAcceso).not.toHaveBeenCalled();
    });

    it('correo inexistente: mismo 401 y también cuenta el fallo (no revela qué correos existen)', async () => {
      usuarios.buscarParaAutenticar.mockResolvedValue(null);

      await expect(servicio.login(credenciales)).rejects.toThrow(
        new UnauthorizedException(
          'El correo o la contrasena no son correctos.',
        ),
      );
      expect(intentos.registrarFallo).toHaveBeenCalledWith('ana@ctp27.test');
    });

    it('quinto fallo: responde 429 con segundosRestantes y mensaje en minutos', async () => {
      usuarios.buscarParaAutenticar.mockResolvedValue(usuario());
      intentos.registrarFallo.mockResolvedValue(600);

      const error = (await servicio
        .login({ ...credenciales, contrasena: 'mala' })
        .catch((e: unknown) => e)) as HttpException;

      expect(error.getStatus()).toBe(429);
      expect(error.getResponse()).toEqual({
        statusCode: 429,
        message:
          'Demasiados intentos fallidos. Intente de nuevo en 10 minutos.',
        segundosRestantes: 600,
      });
    });

    it('bloqueo vigente: 429 sin siquiera consultar el usuario (aunque la contraseña sea correcta)', async () => {
      intentos.segundosRestantes.mockResolvedValue(61);

      const error = (await servicio
        .login(credenciales)
        .catch((e: unknown) => e)) as HttpException;

      expect(error.getStatus()).toBe(429);
      expect((error.getResponse() as { message: string }).message).toBe(
        'Demasiados intentos fallidos. Intente de nuevo en 2 minutos.',
      );
      expect(usuarios.buscarParaAutenticar).not.toHaveBeenCalled();
    });

    it('usa singular cuando falta 1 minuto o menos', async () => {
      intentos.segundosRestantes.mockResolvedValue(30);
      const error = (await servicio
        .login(credenciales)
        .catch((e: unknown) => e)) as HttpException;
      expect((error.getResponse() as { message: string }).message).toContain(
        '1 minuto.',
      );
    });

    it('cuenta desactivada con contraseña correcta: 403 y no emite token', async () => {
      usuarios.buscarParaAutenticar.mockResolvedValue(
        usuario({ activo: false }),
      );

      await expect(servicio.login(credenciales)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(jwt.signAsync).not.toHaveBeenCalled();
      expect(intentos.limpiar).toHaveBeenCalled();
    });

    it('cuenta desactivada con contraseña incorrecta: 401 (no revela que está desactivada)', async () => {
      usuarios.buscarParaAutenticar.mockResolvedValue(
        usuario({ activo: false }),
      );
      await expect(
        servicio.login({ ...credenciales, contrasena: 'mala' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('cookies de sesión', () => {
    it('por defecto (local): httpOnly, Lax, sin Secure, 1 h', () => {
      expect(servicio.opcionesParaSetCookie()).toEqual({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 3_600_000,
      });
    });

    it('producción cross-site: SameSite=None + Secure', () => {
      entorno.COOKIE_SECURE = 'true';
      entorno.COOKIE_SAME_SITE = 'None';
      entorno.JWT_EXPIRACION = '30m';
      const s = new AuthService(
        usuarios as never,
        jwt as never,
        config as never,
        intentos as never,
        mail as never,
        tokensRestablecer as never,
      );
      expect(s.opcionesParaSetCookie()).toMatchObject({
        secure: true,
        sameSite: 'none',
        maxAge: 1_800_000,
      });
    });

    it('clearCookie usa los mismos atributos pero sin maxAge', () => {
      const clear = servicio.opcionesParaClearCookie();
      expect(clear).toEqual({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      });
    });
  });

  describe('actualizarPerfil', () => {
    it('persiste los datos y vuelve a firmar el JWT', async () => {
      usuarios.actualizarPerfilPropio.mockResolvedValue({
        id: 'u-1',
        nombre: 'Ana Mora',
        correo: 'ana.mora@ctp27.test',
        rol: RolUsuario.DOCENTE_AGRICOLA,
      });

      const r = await servicio.actualizarPerfil(
        {
          id: 'u-1',
          nombre: 'Ana',
          correo: 'ana@ctp27.test',
          rol: RolUsuario.DOCENTE_AGRICOLA,
        },
        { nombre: 'Ana Mora', correo: 'ana.mora@ctp27.test' },
      );

      expect(usuarios.actualizarPerfilPropio).toHaveBeenCalledWith('u-1', {
        nombre: 'Ana Mora',
        correo: 'ana.mora@ctp27.test',
      });
      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: 'u-1',
        correo: 'ana.mora@ctp27.test',
        nombre: 'Ana Mora',
        rol: RolUsuario.DOCENTE_AGRICOLA,
      });
      expect(r.usuario.nombre).toBe('Ana Mora');
    });
  });

  describe('cambiarContrasena', () => {
    const actor = {
      id: 'u-1',
      nombre: 'Ana',
      correo: 'ana@ctp27.test',
      rol: RolUsuario.DOCENTE_AGRICOLA,
    };

    it('rechaza si la contraseña actual no coincide', async () => {
      usuarios.buscarParaAutenticarPorId.mockResolvedValue(usuario());

      await expect(
        servicio.cambiarContrasena(actor, {
          contrasenaActual: 'Mala1234',
          contrasenaNueva: 'Nueva1234',
        }),
      ).rejects.toThrow(
        new UnauthorizedException('La contraseña actual no es correcta.'),
      );
      expect(usuarios.reemplazarContrasena).not.toHaveBeenCalled();
    });

    it('rechaza si la nueva contraseña es igual a la actual', async () => {
      usuarios.buscarParaAutenticarPorId.mockResolvedValue(usuario());

      await expect(
        servicio.cambiarContrasena(actor, {
          contrasenaActual: 'Correcta1',
          contrasenaNueva: 'Correcta1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('guarda un hash nuevo cuando la actual es correcta', async () => {
      usuarios.buscarParaAutenticarPorId.mockResolvedValue(usuario());

      await expect(
        servicio.cambiarContrasena(actor, {
          contrasenaActual: 'Correcta1',
          contrasenaNueva: 'Nueva1234',
        }),
      ).resolves.toEqual({ ok: true });
      expect(usuarios.reemplazarContrasena).toHaveBeenCalledWith(
        'u-1',
        expect.stringMatching(/^\$2[aby]\$12\$/),
      );
    });
  });

  it('hashearContrasena produce un hash bcrypt verificable y distinto en cada llamada', async () => {
    const a = await servicio.hashearContrasena('Clave1234');
    const b = await servicio.hashearContrasena('Clave1234');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^\$2[aby]\$12\$/);
    expect(await bcrypt.compare('Clave1234', a)).toBe(true);
  });
});
