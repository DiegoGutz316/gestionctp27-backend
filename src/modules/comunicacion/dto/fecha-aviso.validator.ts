import {
  registerDecorator,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fecha real en formato AAAA-MM-DD. A diferencia del resto del sistema, aqui
 * SI se admiten fechas futuras: un aviso anuncia una actividad que todavia no
 * ocurrio, que es justamente para lo que sirve publicarlo.
 *
 * La comprobacion `toISOString().slice(0, 10) === valor` descarta fechas que
 * existen como texto pero no en el calendario: `2026-02-31` se normalizaria a
 * marzo y sin esto pasaria como valida.
 */
export function esFechaDeAvisoValida(valor: unknown): boolean {
  if (typeof valor !== 'string' || !PATRON_FECHA.test(valor)) return false;

  const fecha = new Date(`${valor}T00:00:00.000Z`);

  return (
    !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor
  );
}

@ValidatorConstraint({ name: 'fechaAviso', async: false })
class FechaAvisoConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return esFechaDeAvisoValida(value);
  }

  defaultMessage(): string {
    return 'Ingrese una fecha válida (AAAA-MM-DD)';
  }
}

export function EsFechaDeAviso(
  opciones?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      target: target.constructor,
      propertyName: String(propertyName),
      options: opciones,
      validator: FechaAvisoConstraint,
    });
  };
}
