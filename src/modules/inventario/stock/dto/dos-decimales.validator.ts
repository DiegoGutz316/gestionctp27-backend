import { registerDecorator, type ValidationOptions } from 'class-validator';
import { DECIMALES_PERMITIDOS } from './limites-numericos';

/**
 * Valida que un número tenga como mucho los decimales que admite la columna.
 *
 * Sustituye a `@IsNumber({ maxDecimalPlaces })` de class-validator, que falla
 * con la notación exponencial: para un valor como `1e-7` su implementación
 * accede a `undefined.length` y lanza una excepción, que salía como error 500
 * en lugar de un 400 de validación. Aquí se compara contra `toFixed`, que se
 * comporta igual con cualquier magnitud y descarta la notación exponencial.
 */
export function TieneDecimalesPermitidos(opciones?: ValidationOptions) {
  return function (objeto: object, propiedad: string) {
    registerDecorator({
      name: 'tieneDecimalesPermitidos',
      target: objeto.constructor,
      propertyName: propiedad,
      options: opciones,
      validator: {
        validate(valor: unknown): boolean {
          // Que no sea un número lo reporta @IsNumber; aquí no se duplica.
          if (typeof valor !== 'number' || !Number.isFinite(valor)) return true;
          return Number(valor.toFixed(DECIMALES_PERMITIDOS)) === valor;
        },
      },
    });
  };
}
