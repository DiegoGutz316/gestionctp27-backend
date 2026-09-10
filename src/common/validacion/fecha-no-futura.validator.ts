import {
  registerDecorator,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * "Hoy" segun la zona horaria de Costa Rica, no la del servidor: en Railway el
 * proceso corre en UTC y a partir de las 18:00 hora local ya seria el dia
 * siguiente, lo que rechazaria registros de hoy por "futuros".
 */
export function fechaDeHoy(fecha = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(fecha);

  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';

  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

/**
 * Valida que sea una fecha real en formato AAAA-MM-DD y que no sea futura.
 *
 * La comprobacion `toISOString().slice(0, 10) === valor` descarta fechas que
 * existen como texto pero no en el calendario: `2026-02-31` se normalizaria a
 * marzo, y sin esto pasaria como valida.
 */
export function esFechaNoFutura(valor: unknown, hoy = fechaDeHoy()): boolean {
  if (typeof valor !== 'string' || !PATRON_FECHA.test(valor)) return false;

  const fecha = new Date(`${valor}T00:00:00.000Z`);

  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor &&
    valor <= hoy
  );
}

@ValidatorConstraint({ name: 'fechaNoFutura', async: false })
class FechaNoFuturaConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return esFechaNoFutura(value);
  }

  defaultMessage(): string {
    return 'Ingrese una fecha válida (AAAA-MM-DD) que no sea futura';
  }
}

export function EsFechaNoFutura(
  opciones?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      target: target.constructor,
      propertyName: String(propertyName),
      options: opciones,
      validator: FechaNoFuturaConstraint,
    });
  };
}
