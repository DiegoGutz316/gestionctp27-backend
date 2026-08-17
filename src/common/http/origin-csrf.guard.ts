import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { obtenerOrigenesPermitidos } from './origenes-permitidos';

const METODOS_INSEGUROS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class OriginCsrfGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!METODOS_INSEGUROS.has(request.method.toUpperCase())) return true;

    const origin = request.headers.origin;
    if (
      origin &&
      !obtenerOrigenesPermitidos((clave) =>
        this.config.get<string>(clave),
      ).includes(origin)
    ) {
      throw new ForbiddenException(
        'El origen de la solicitud no está permitido.',
      );
    }

    const longitud = request.headers['content-length'];
    const tieneBody =
      request.headers['transfer-encoding'] !== undefined ||
      (longitud !== undefined && longitud !== '0');
    if (tieneBody && !request.is('application/json')) {
      throw new UnsupportedMediaTypeException(
        'Las mutaciones con cuerpo requieren Content-Type application/json.',
      );
    }
    return true;
  }
}
