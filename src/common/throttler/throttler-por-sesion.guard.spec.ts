import { createHash } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';

import { NOMBRE_COOKIE_ACCESO } from '../../modules/auth/constantes/cookie-auth';
import { ThrottlerPorSesionGuard } from './throttler-por-sesion.guard';

const SECRETO = 'secreto-de-prueba';

/** `getTracker` y `generateKey` son protegidos: se exponen para probarlos. */
class GuardExpuesto extends ThrottlerPorSesionGuard {
  llave(req: Record<string, unknown>) {
    return this.getTracker(req);
  }

  llaveFinal(context: unknown, sufijo: string) {
    return this.generateKey(context as never, sufijo, 'default');
  }
}

describe('ThrottlerPorSesionGuard', () => {
  const jwt = new JwtService({ secret: SECRETO });
  const tokenDe = (id: string) => jwt.sign({ sub: id }, { expiresIn: '1h' });

  let esPublica: boolean | undefined;
  let guard: GuardExpuesto;

  beforeEach(() => {
    esPublica = undefined;
    guard = new GuardExpuesto(
      [{ ttl: 60000, limit: 20 }] as never,
      {} as never,
      { getAllAndOverride: () => esPublica } as never,
      { getOrThrow: () => SECRETO } as never,
    );
  });

  const conCookie = (valor: unknown, ip = '190.0.0.1') => ({
    ip,
    cookies: { [NOMBRE_COOKIE_ACCESO]: valor },
  });

  describe('una sesión válida tiene su propio contador', () => {
    it('dos sesiones no comparten contador aunque vengan de la misma IP', async () => {
      // El caso del laboratorio: dos maquinas, una sola IP publica.
      const ana = await guard.llave(conCookie(tokenDe('ana'), '190.0.0.1'));
      const pedro = await guard.llave(conCookie(tokenDe('pedro'), '190.0.0.1'));

      expect(ana).not.toBe(pedro);
      expect(ana).toMatch(/^sesion:/);
    });

    it('la misma sesión cuenta igual aunque cambie de IP', async () => {
      const token = tokenDe('ana');

      expect(await guard.llave(conCookie(token, '190.0.0.1'))).toBe(
        await guard.llave(conCookie(token, '201.5.5.5')),
      );
    });

    it('no usa el token en claro como llave', async () => {
      const token = tokenDe('ana');
      const llave = await guard.llave(conCookie(token));

      expect(llave).not.toContain(token);
      expect(llave).toBe(
        `sesion:${createHash('sha256').update(token).digest('hex')}`,
      );
    });
  });

  describe('una cookie que no vale no da contador propio', () => {
    it('un token inventado se cuenta por IP', async () => {
      // Si no, bastaria con mandar una cookie distinta cada vez para estrenar
      // contador y saltarse el limite.
      expect(await guard.llave(conCookie('inventado-123'))).toBe('190.0.0.1');
    });

    it('un token firmado con otro secreto se cuenta por IP', async () => {
      const ajeno = new JwtService({ secret: 'otro-secreto' }).sign({
        sub: 'ana',
      });

      expect(await guard.llave(conCookie(ajeno))).toBe('190.0.0.1');
    });

    it('un token vencido se cuenta por IP', async () => {
      const vencido = jwt.sign({ sub: 'ana' }, { expiresIn: '-1h' });

      expect(await guard.llave(conCookie(vencido))).toBe('190.0.0.1');
    });

    it.each([
      ['sin cookies', { ip: '190.0.0.1' }],
      ['sin la cookie de sesión', { ip: '190.0.0.1', cookies: {} }],
      [
        'con la cookie vacía',
        { ip: '190.0.0.1', cookies: { [NOMBRE_COOKIE_ACCESO]: '' } },
      ],
      [
        'con una cookie que no es texto',
        { ip: '190.0.0.1', cookies: { [NOMBRE_COOKIE_ACCESO]: 123 } },
      ],
    ])('%s: se cuenta por IP', async (_caso, req) => {
      expect(await guard.llave(req)).toBe('190.0.0.1');
    });
  });

  describe('las rutas públicas se cuentan siempre por IP', () => {
    const contexto = {
      getHandler: () => ({ name: 'recuperarContrasena' }),
      getClass: () => ({ name: 'AuthController' }),
      switchToHttp: () => ({ getRequest: () => ({ ip: '190.0.0.1' }) }),
    };

    it('ignora la sesión en una ruta marcada con @Publico()', () => {
      esPublica = true;
      const conSesion = guard.llaveFinal(contexto, 'sesion:abc');
      const porIp = guard.llaveFinal(contexto, '190.0.0.1');

      // Misma llave: el limite del login y de recuperar contraseña no se
      // esquiva presentando una sesión.
      expect(conSesion).toBe(porIp);
    });

    it('en una ruta privada sí respeta la sesión', () => {
      esPublica = undefined;

      expect(guard.llaveFinal(contexto, 'sesion:abc')).not.toBe(
        guard.llaveFinal(contexto, '190.0.0.1'),
      );
    });

    it('dos sesiones distintas siguen separadas en rutas privadas', () => {
      esPublica = undefined;

      expect(guard.llaveFinal(contexto, 'sesion:ana')).not.toBe(
        guard.llaveFinal(contexto, 'sesion:pedro'),
      );
    });
  });
});
