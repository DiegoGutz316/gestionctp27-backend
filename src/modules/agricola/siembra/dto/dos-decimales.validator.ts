import {
  registerDecorator,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Sustituye a `@IsNumber({ maxDecimalPlaces })` de class-validator, que falla
 * con la notacion exponencial: para un valor como `1e-7` accede a
 * `undefined.length` y lanza una excepcion, que sale como error 500 en vez de
 * un 400 de validacion.
 *
 * La comparacion es contra `toFixed` y no multiplicando por 100: por el
 * redondeo de coma flotante, `8.29 * 100` da 828.9999999999999, asi que la
 * version anterior rechazaba cantidades validas como 8.29 o 70.07.
 */
@ValidatorConstraint({ name: 'dosDecimalesSiembra', async: false })
class DosDecimalesSiembraConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      Number(value.toFixed(2)) === value
    );
  }
}

export function TieneMaximoDosDecimales(
  opciones?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      target: target.constructor,
      propertyName: String(propertyName),
      options: opciones,
      validator: DosDecimalesSiembraConstraint,
    });
  };
}
