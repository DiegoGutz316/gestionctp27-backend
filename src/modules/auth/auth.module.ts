import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsuariosModule } from '../usuarios/usuarios.module';

/**
 * `StringValue` (de la libreria `ms`) no es una dependencia directa: la
 * expone `jsonwebtoken` via @nestjs/jwt. Se deriva el tipo desde ahi en vez
 * de importar `ms` directamente (pnpm bloquea esa dependencia fantasma).
 */
type StringValue = Exclude<NonNullable<JwtSignOptions['expiresIn']>, number>;

/**
 * Valor por defecto de expiracion del JWT, tipado como el `StringValue` que
 * espera `jsonwebtoken` (via @nestjs/jwt) y no como `string` generico.
 */
const EXPIRACION_POR_DEFECTO: StringValue = '8h';

/**
 * Formato aceptado por `ms` para `StringValue`: un numero solo, o un numero
 * seguido de una unidad (con o sin espacio), p. ej. "8h", "8 horas", "30".
 */
const PATRON_STRING_VALUE = /^\d+(\.\d+)?(\s?[a-zA-Z]+)?$/;

function esStringValueValida(valor: string): valor is StringValue {
  return PATRON_STRING_VALUE.test(valor);
}

/**
 * Lee JWT_EXPIRACION del .env y la valida contra el patron de `StringValue`.
 * Si no viene configurada o no calza con el patron, se usa el valor por
 * defecto en lugar de forzar el tipo con un cast inseguro.
 */
function resolverExpiracion(config: ConfigService): StringValue {
  const valor = config.get<string>('JWT_EXPIRACION');
  if (valor && esStringValueValida(valor)) {
    return valor;
  }
  return EXPIRACION_POR_DEFECTO;
}

@Module({
  imports: [
    UsuariosModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: resolverExpiracion(config),
          issuer: 'gestionctp27',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
