import {
  CanActivate,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * El panel solo existe si QA_USABILIDAD_ENABLED=true.
 * En producción (sin flag) responde 404 para no exponer la ruta.
 */
@Injectable()
export class QaUsabilidadHabilitadoGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    const activo = this.config.get<string>('QA_USABILIDAD_ENABLED');
    if (activo !== 'true' && activo !== '1') {
      throw new NotFoundException();
    }
    return true;
  }
}
