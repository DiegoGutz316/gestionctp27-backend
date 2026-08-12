import type { CookieOptions } from 'express';

/** Nombre de la cookie httpOnly que transporta el JWT. */
export const NOMBRE_COOKIE_ACCESO = 'ctp27_access_token';

/**
 * Convierte JWT_EXPIRACION (formato ms, p. ej. "8h") a milisegundos para maxAge.
 * Si el valor no es reconocible, usa 8 horas.
 */
export function expiracionAMs(valor: string | undefined): number {
  const porDefecto = 8 * 60 * 60 * 1000;
  if (!valor) return porDefecto;

  const match = /^(\d+(?:\.\d+)?)\s*([smhd])$/i.exec(valor.trim());
  if (!match) return porDefecto;

  const cantidad = Number(match[1]);
  const unidad = match[2].toLowerCase();
  const factores: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return cantidad * (factores[unidad] ?? 1000);
}

export type OpcionesCookieAuth = {
  secure: boolean;
  sameSite: CookieOptions['sameSite'];
  maxAge: number;
};

/**
 * Opciones de la cookie de sesión.
 * - Local (puertos distintos, mismo host): SameSite=Lax + Secure=false.
 * - Producción cross-site (Vercel + Railway): SameSite=None + Secure=true.
 */
export function construirOpcionesCookie(
  get: (key: string) => string | undefined,
): OpcionesCookieAuth {
  const secure = get('COOKIE_SECURE') === 'true';
  const sameSiteEnv = (get('COOKIE_SAME_SITE') ?? 'lax').toLowerCase();
  const sameSite: CookieOptions['sameSite'] =
    sameSiteEnv === 'none' || sameSiteEnv === 'strict' || sameSiteEnv === 'lax'
      ? sameSiteEnv
      : 'lax';

  return {
    secure,
    sameSite,
    maxAge: expiracionAMs(get('JWT_EXPIRACION')),
  };
}

export function opcionesSetCookie(opciones: OpcionesCookieAuth): CookieOptions {
  return {
    httpOnly: true,
    secure: opciones.secure,
    sameSite: opciones.sameSite,
    path: '/',
    maxAge: opciones.maxAge,
  };
}

export function opcionesClearCookie(
  opciones: OpcionesCookieAuth,
): CookieOptions {
  return {
    httpOnly: true,
    secure: opciones.secure,
    sameSite: opciones.sameSite,
    path: '/',
  };
}
