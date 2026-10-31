import { createHash } from 'node:crypto';

import { NOMBRE_COOKIE_ACCESO } from '../../modules/auth/constantes/cookie-auth';
import { ThrottlerPorSesionGuard } from './throttler-por-sesion.guard';

/** `getTracker` es protegido: se expone para poder probarlo. */
class GuardExpuesto extends ThrottlerPorSesionGuard {
  llave(req: Record<string, unknown>) {
    return this.getTracker(req);
  }
}

describe('ThrottlerPorSesionGuard', () => {
  const guard = new GuardExpuesto(
    [] as never,
    {} as never,
    { getAllAndOverride: () => undefined } as never,
  );

  const conSesion = (token: string, ip = '190.0.0.1') => ({
    ip,
    cookies: { [NOMBRE_COOKIE_ACCESO]: token },
  });

  it('cada sesión tiene su propio contador', async () => {
    const ana = await guard.llave(conSesion('token-de-ana'));
    const pedro = await guard.llave(conSesion('token-de-pedro'));

    expect(ana).not.toBe(pedro);
  });

  it('la misma IP no junta a dos personas distintas', async () => {
    // El caso del laboratorio: dos maquinas, una sola IP publica.
    const ana = await guard.llave(conSesion('token-de-ana', '190.0.0.1'));
    const pedro = await guard.llave(conSesion('token-de-pedro', '190.0.0.1'));

    expect(ana).not.toBe(pedro);
  });

  it('la misma sesión cuenta siempre en el mismo contador', async () => {
    const primera = await guard.llave(conSesion('token-de-ana', '190.0.0.1'));
    // Aunque cambie la IP, por ejemplo al pasar del wifi a los datos.
    const segunda = await guard.llave(conSesion('token-de-ana', '201.5.5.5'));

    expect(primera).toBe(segunda);
  });

  it('no usa el token en claro como llave', async () => {
    const llave = await guard.llave(conSesion('token-de-ana'));

    expect(llave).not.toContain('token-de-ana');
    expect(llave).toBe(
      `sesion:${createHash('sha256').update('token-de-ana').digest('hex')}`,
    );
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
  ])('%s: vuelve a contar por IP', async (_caso, req) => {
    // El ingreso y la landing caen aqui, y ahi contar por IP es lo correcto.
    const llave = await guard.llave(req);

    expect(llave).toBe('190.0.0.1');
  });
});
