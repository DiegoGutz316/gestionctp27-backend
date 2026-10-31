import { createHash } from 'node:crypto';
import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  ThrottlerGuard,
  getOptionsToken,
  getStorageToken,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from '@nestjs/throttler';

import { NOMBRE_COOKIE_ACCESO } from '../../modules/auth/constantes/cookie-auth';
import { CLAVE_PUBLICO } from '../../modules/auth/decorators/publico.decorator';

/**
 * Cuenta el limite de peticiones por sesion, no por direccion IP.
 *
 * El colegio sale a internet por una sola IP publica: contando por IP, todas
 * las maquinas del laboratorio comparten las 20 peticiones por minuto y se
 * bloquean entre ellas. Un solo usuario gasta 15 de esas 20 en medio minuto de
 * uso normal, asi que con dos personas trabajando a la vez el cupo se agota
 * sin que nadie haga nada raro.
 *
 * Dos reglas evitan que la cookie se use para esquivar el limite:
 *
 * 1. **La firma del token se valida.** Si no, cualquiera mandaria una cookie
 *    inventada distinta en cada peticion y estrenaria contador cada vez.
 * 2. **Las rutas publicas se cuentan siempre por IP.** Ahi el limite protege
 *    de la fuerza bruta y del envio masivo de correos de recuperacion, y una
 *    sesion valida no deberia servir para saltarselo: con un token se pediria
 *    otro, y con ese otro mas, sin tope.
 *
 * Se usa la cookie y no `request.user` porque este guard corre antes que
 * `JwtAuthGuard` (ver el orden en `app.module.ts`), asi que el usuario todavia
 * no esta resuelto. Se guarda el hash del token y no el token, para no dejarlo
 * en claro como llave del contador.
 */
@Injectable()
export class ThrottlerPorSesionGuard extends ThrottlerGuard {
  private readonly jwt: JwtService;

  constructor(
    @Inject(getOptionsToken()) opciones: ThrottlerModuleOptions,
    @Inject(getStorageToken()) almacen: ThrottlerStorage,
    reflector: Reflector,
    config: ConfigService,
  ) {
    super(opciones, almacen, reflector);
    this.jwt = new JwtService({
      secret: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[NOMBRE_COOKIE_ACCESO];

    if (typeof token !== 'string' || token === '') {
      return super.getTracker(req);
    }

    try {
      this.jwt.verify(token);
    } catch {
      // Token vencido o inventado: no da derecho a un contador propio.
      return super.getTracker(req);
    }

    return `sesion:${createHash('sha256').update(token).digest('hex')}`;
  }

  /**
   * En las rutas publicas se ignora la sesion y se cuenta por IP.
   *
   * `generateKey` es el ultimo punto donde todavia se tiene el contexto, que
   * es lo que hace falta para leer `@Publico()`.
   */
  protected generateKey(
    context: ExecutionContext,
    suffix: string,
    name: string,
  ): string {
    const esPublica = this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!esPublica) {
      return super.generateKey(context, suffix, name);
    }

    const req = context.switchToHttp().getRequest<{ ip?: string }>();

    return super.generateKey(context, req.ip ?? suffix, name);
  }
}
