import { construirOpcionesCookie, expiracionAMs } from './cookie-auth';

describe('expiracionAMs', () => {
  it.each([
    ['30s', 30_000],
    ['15m', 900_000],
    ['8h', 28_800_000],
    ['7d', 604_800_000],
    ['1.5h', 5_400_000],
    [' 2H ', 7_200_000],
  ])('convierte %s', (valor, esperado) => {
    expect(expiracionAMs(valor)).toBe(esperado);
  });

  it.each([undefined, '', 'abc', '10', '10x', '-5h'])(
    'valor %p cae a 1 hora',
    (valor) => {
      expect(expiracionAMs(valor)).toBe(3_600_000);
    },
  );
});

describe('construirOpcionesCookie', () => {
  const desde = (env: Record<string, string>) =>
    construirOpcionesCookie((k) => env[k]);

  it('sin variables: lax, no secure', () => {
    expect(desde({})).toEqual({
      secure: false,
      sameSite: 'lax',
      maxAge: 3_600_000,
    });
  });

  it.each(['none', 'strict', 'lax', 'NONE'])(
    'acepta COOKIE_SAME_SITE=%s',
    (v) => {
      expect(desde({ COOKIE_SAME_SITE: v }).sameSite).toBe(v.toLowerCase());
    },
  );

  it('valor desconocido de SameSite cae a lax', () => {
    expect(desde({ COOKIE_SAME_SITE: 'raro' }).sameSite).toBe('lax');
  });

  it('solo COOKIE_SECURE=true activa Secure', () => {
    expect(desde({ COOKIE_SECURE: 'true' }).secure).toBe(true);
    expect(desde({ COOKIE_SECURE: '1' }).secure).toBe(false);
  });
});
