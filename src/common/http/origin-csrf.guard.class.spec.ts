/**
 * Pruebas unitarias - OriginCsrfGuard (guard global que protege TODOS los
 * endpoints mutantes: POST, PUT, PATCH, DELETE) y utilidades asociadas.
 */
import {
  ForbiddenException,
  UnsupportedMediaTypeException,
  type ExecutionContext,
} from '@nestjs/common';
import { NOMBRE_COOKIE_ACCESO } from '../../modules/auth/constantes/cookie-auth';
import { obtenerOrigenesPermitidos } from './origenes-permitidos';
import {
  OriginCsrfGuard,
  origenDeReferer,
  origenDelServidor,
  tieneCookieDeSesion,
} from './origin-csrf.guard';

const FRONT = 'http://localhost:3000';

function contexto(opts: {
  method: string;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  tipo?: 'json' | 'multipart' | 'texto' | null;
}): ExecutionContext {
  const tipo = opts.tipo ?? null;
  const solicitud = {
    method: opts.method,
    protocol: 'http',
    headers: { host: 'api.local:4000', ...opts.headers },
    cookies: opts.cookies,
    is: (t: string) =>
      t === 'application/json'
        ? tipo === 'json'
        : t === 'multipart/form-data'
          ? tipo === 'multipart'
          : false,
  };
  return {
    switchToHttp: () => ({ getRequest: () => solicitud }),
  } as unknown as ExecutionContext;
}

describe('OriginCsrfGuard.canActivate', () => {
  const entorno: Record<string, string> = { CORS_ORIGIN: FRONT };
  const guard = new OriginCsrfGuard({
    get: (k: string) => entorno[k],
  } as never);

  it.each(['GET', 'HEAD', 'OPTIONS', 'get'])(
    '%s no se valida (método seguro)',
    (method) => {
      expect(
        guard.canActivate(
          contexto({ method, headers: { origin: 'http://malo.com' } }),
        ),
      ).toBe(true);
    },
  );

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    '%s con Origin ajeno: 403',
    (method) => {
      expect(() =>
        guard.canActivate(
          contexto({ method, headers: { origin: 'http://malo.com' } }),
        ),
      ).toThrow(ForbiddenException);
    },
  );

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    '%s con Origin del frontend: permitido',
    (method) => {
      expect(
        guard.canActivate(contexto({ method, headers: { origin: FRONT } })),
      ).toBe(true);
    },
  );

  it('mutación con cookie de sesión y sin Origin ni Referer: 403 (CSRF)', () => {
    expect(() =>
      guard.canActivate(
        contexto({
          method: 'POST',
          cookies: { [NOMBRE_COOKIE_ACCESO]: 'jwt' },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('mutación con cookie y Referer del frontend: permitido', () => {
    expect(
      guard.canActivate(
        contexto({
          method: 'PATCH',
          cookies: { [NOMBRE_COOKIE_ACCESO]: 'jwt' },
          headers: { referer: `${FRONT}/panel` },
        }),
      ),
    ).toBe(true);
  });

  it('mutación Bearer (sin cookie, sin Origin): permitida', () => {
    expect(
      guard.canActivate(
        contexto({ method: 'POST', headers: { authorization: 'Bearer x' } }),
      ),
    ).toBe(true);
  });

  describe('tipo de contenido del cuerpo', () => {
    const base = { method: 'POST', headers: { origin: FRONT } };

    it('cuerpo JSON: permitido', () => {
      expect(
        guard.canActivate(
          contexto({
            ...base,
            headers: { ...base.headers, 'content-length': '20' },
            tipo: 'json',
          }),
        ),
      ).toBe(true);
    });

    it('cuerpo multipart (subida de flyer): permitido', () => {
      expect(
        guard.canActivate(
          contexto({
            ...base,
            headers: { ...base.headers, 'content-length': '2000' },
            tipo: 'multipart',
          }),
        ),
      ).toBe(true);
    });

    it('cuerpo form-urlencoded o text/plain (formularios cross-site): 415', () => {
      expect(() =>
        guard.canActivate(
          contexto({
            ...base,
            headers: { ...base.headers, 'content-length': '20' },
            tipo: 'texto',
          }),
        ),
      ).toThrow(UnsupportedMediaTypeException);
    });

    it('transfer-encoding sin JSON: 415', () => {
      expect(() =>
        guard.canActivate(
          contexto({
            ...base,
            headers: { ...base.headers, 'transfer-encoding': 'chunked' },
            tipo: 'texto',
          }),
        ),
      ).toThrow(UnsupportedMediaTypeException);
    });

    it('sin cuerpo (content-length 0 o ausente): no exige tipo', () => {
      expect(
        guard.canActivate(
          contexto({
            ...base,
            headers: { ...base.headers, 'content-length': '0' },
          }),
        ),
      ).toBe(true);
      expect(guard.canActivate(contexto(base))).toBe(true);
    });
  });
});

describe('utilidades de origen', () => {
  it.each([
    ['http://localhost:3000/panel?x=1', 'http://localhost:3000'],
    ['https://app.ctp27.cr/a/b', 'https://app.ctp27.cr'],
  ])('origenDeReferer(%s)', (referer, esperado) => {
    expect(origenDeReferer(referer)).toBe(esperado);
  });

  it.each([undefined, null, '', '   ', 'no-es-url', 42])(
    'origenDeReferer(%p) = undefined',
    (referer) => {
      expect(origenDeReferer(referer)).toBeUndefined();
    },
  );

  it('origenDelServidor arma protocolo://host y descarta hosts vacíos', () => {
    expect(origenDelServidor('https', ' api.x.cr ')).toBe('https://api.x.cr');
    expect(origenDelServidor('http', '')).toBeUndefined();
    expect(origenDelServidor('http', undefined)).toBeUndefined();
  });

  it('tieneCookieDeSesion solo es true con la cookie de acceso no vacía', () => {
    expect(tieneCookieDeSesion({ [NOMBRE_COOKIE_ACCESO]: 'abc' })).toBe(true);
    expect(tieneCookieDeSesion({ [NOMBRE_COOKIE_ACCESO]: '' })).toBe(false);
    expect(tieneCookieDeSesion({ otra: 'x' })).toBe(false);
    expect(tieneCookieDeSesion(undefined)).toBe(false);
    expect(tieneCookieDeSesion('texto')).toBe(false);
  });
});

describe('obtenerOrigenesPermitidos', () => {
  const desde = (env: Record<string, string>) =>
    obtenerOrigenesPermitidos((k) => env[k]);

  it('sin configuración usa localhost:3000', () => {
    expect(desde({})).toEqual(['http://localhost:3000']);
  });

  it('une CORS_ORIGIN y CORS_ORIGINS, recorta espacios y quita duplicados', () => {
    expect(
      desde({
        CORS_ORIGIN: 'https://a.cr',
        CORS_ORIGINS: ' https://b.cr , https://a.cr ,, ',
      }),
    ).toEqual(['https://a.cr', 'https://b.cr']);
  });
});
