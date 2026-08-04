import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { CLAVE_PUBLICO } from '../decorators/publico.decorator';

/**
 * Task: "Proteger rutas segun autenticacion".
 *
 * Se registra como guard global en AppModule: todo endpoint del sistema exige
 * token salvo los marcados con @Publico(). Es seguro por defecto, porque
 * olvidar el decorador deja la ruta protegida en vez de expuesta.
 *
 * AVISO AL EQUIPO: al mergear este cambio, cualquier endpoint nuevo necesita
 * token. Los endpoints publicos (health check, por ejemplo) deben marcarse
 * con @Publico().
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const esPublico = this.reflector.getAllAndOverride<boolean>(CLAVE_PUBLICO, [
      context.getHandler(),
      context.getClass(),
    ]);

    return esPublico ? true : super.canActivate(context);
  }
}
