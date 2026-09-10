import {
  registerDecorator,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function fechaActualCostaRica(fecha = new Date()): string {
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

export function esFechaIsoValida(valor: unknown): boolean {
  if (typeof valor !== 'string' || !PATRON_FECHA.test(valor)) {
    return false;
  }

  const fecha = new Date(`${valor}T00:00:00.000Z`);

  return (
    !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor
  );
}

@ValidatorConstraint({ name: 'fechaProduccion', async: false })
class FechaProduccionConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (!esFechaIsoValida(value) || typeof value !== 'string') {
      return false;
    }

    return value <= fechaActualCostaRica();
  }

  defaultMessage(): string {
    return 'Ingrese una fecha válida, exacta (AAAA-MM-DD) y no futura';
  }
}

export function EsFechaProduccion(
  opciones?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      target: target.constructor,
      propertyName: String(propertyName),
      options: opciones,
      validator: FechaProduccionConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'fechaIsoProduccion', async: false })
class FechaIsoConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return esFechaIsoValida(value);
  }

  defaultMessage(): string {
    return 'Ingrese una fecha válida en formato AAAA-MM-DD';
  }
}

export function EsFechaIsoProduccion(
  opciones?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      target: target.constructor,
      propertyName: String(propertyName),
      options: opciones,
      validator: FechaIsoConstraint,
    });
  };
}
