import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import { NOMBRE_COOKIE_ACCESO } from '../../modules/auth/constantes/cookie-auth';

/**
 * Cuenta el limite de peticiones por sesion, no por direccion IP.
 *
 * El colegio sale a internet por una sola IP publica: contando por IP, todas
 * las maquinas del laboratorio comparten las 20 peticiones por minuto y se
 * bloquean entre ellas. Un solo usuario gasta 15 de esas 20 en medio minuto de
 * uso normal, asi que con dos personas trabajando a la vez el cupo se agota
 * sin que nadie haga nada raro.
 *
 * Se usa la cookie de sesion y no `request.user` porque este guard corre antes
 * que `JwtAuthGuard` (ver el orden en `app.module.ts`), asi que el usuario
 * todavia no esta resuelto. La cookie alcanza: cada sesion abierta tiene la
 * suya. Se guarda el hash y no el token, para no dejarlo en claro como llave
 * del contador.
 *
 * Las peticiones sin sesion —el ingreso, la landing, recuperar la contrasena—
 * se siguen contando por IP, que es lo que corresponde: ahi no hay a quien
 * atribuirlas y ademas esas rutas tienen su propio limite mas estricto.
 */
@Injectable()
export class ThrottlerPorSesionGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[NOMBRE_COOKIE_ACCESO];

    if (typeof token !== 'string' || token === '') {
      return super.getTracker(req);
    }

    return `sesion:${createHash('sha256').update(token).digest('hex')}`;
  }
}
