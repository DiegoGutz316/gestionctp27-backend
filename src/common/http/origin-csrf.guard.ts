import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { NOMBRE_COOKIE_ACCESO } from '../../modules/auth/constantes/cookie-auth';
import { obtenerOrigenesPermitidos } from './origenes-permitidos';

const METODOS_INSEGUROS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function origenDeReferer(referer: unknown): string | undefined {
  if (typeof referer !== 'string' || referer.trim() === '') return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}

export function origenDelServidor(
  protocolo: string,
  host: unknown,
): string | undefined {
  if (typeof host !== 'string' || host.trim() === '') return undefined;
  return `${protocolo}://${host.trim()}`;
}

export function tieneCookieDeSesion(cookies: unknown): boolean {
  if (!cookies || typeof cookies !== 'object') return false;
  const valor = (cookies as Record<string, unknown>)[NOMBRE_COOKIE_ACCESO];
  return typeof valor === 'string' && valor.length > 0;
}

/**
 * Una mutación autenticada por cookie necesita Origin o Referer conocidos.
 * El Bearer sin cookie no depende del navegador: no exige esas cabeceras,
 * pero un Origin presente y ajeno igual se rechaza.
 */
export function origenMutantePermitido(params: {
  origin: unknown;
  referer: unknown;
  host: unknown;
  protocolo: string;
  cookiePresente: boolean;
  permitidos: string[];
}): boolean {
  const permitidos = new Set(
    [
      ...params.permitidos,
      origenDelServidor(params.protocolo, params.host),
    ].filter((valor): valor is string => Boolean(valor)),
  );

  if (typeof params.origin === 'string' && params.origin.length > 0) {
    return permitidos.has(params.origin);
  }

  if (!params.cookiePresente) return true;

  const referer = origenDeReferer(params.referer);
  return Boolean(referer && permitidos.has(referer));
}

@Injectable()
export class OriginCsrfGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!METODOS_INSEGUROS.has(request.method.toUpperCase())) return true;

    const permitidos = obtenerOrigenesPermitidos((clave) =>
      this.config.get<string>(clave),
    );
    const autorizado = origenMutantePermitido({
      origin: request.headers.origin,
      referer: request.headers.referer,
      host: request.headers.host,
      protocolo: request.protocol || 'http',
      cookiePresente: tieneCookieDeSesion(request.cookies),
      permitidos,
    });
    if (!autorizado) {
      throw new ForbiddenException(
        'El origen de la solicitud no está permitido.',
      );
    }

    const longitud = request.headers['content-length'];
    const tieneBody =
      request.headers['transfer-encoding'] !== undefined ||
      (longitud !== undefined && longitud !== '0');
    const esJson = request.is('application/json');
    const esArchivo = request.is('multipart/form-data');
    if (tieneBody && !esJson && !esArchivo) {
      throw new UnsupportedMediaTypeException(
        'El cuerpo debe enviarse como JSON o como archivo (multipart/form-data).',
      );
    }
    return true;
  }
}
