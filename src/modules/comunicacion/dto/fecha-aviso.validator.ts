import {
  registerDecorator,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

import { fechaDeHoy } from '../../../common/validacion/fecha-no-futura.validator';

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fecha real en formato AAAA-MM-DD, de hoy en adelante (hora de Costa Rica).
 * Un aviso anuncia una actividad que todavía no pasó: ayer y las fechas
 * anteriores no se aceptan. Hoy sí, porque el comunicado puede ser del mismo día.
 *
 * La comprobacion `toISOString().slice(0, 10) === valor` descarta fechas que
 * existen como texto pero no en el calendario: `2026-02-31` se normalizaria a
 * marzo y sin esto pasaria como valida.
 */
export function esFechaDeAvisoValida(
  valor: unknown,
  hoy = fechaDeHoy(),
): boolean {
  if (typeof valor !== 'string' || !PATRON_FECHA.test(valor)) return false;

  const fecha = new Date(`${valor}T00:00:00.000Z`);

  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor &&
    valor >= hoy
  );
}

@ValidatorConstraint({ name: 'fechaAviso', async: false })
class FechaAvisoConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return esFechaDeAvisoValida(value);
  }

  defaultMessage(): string {
    return 'La fecha del aviso debe ser hoy o posterior';
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
