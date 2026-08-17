import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function fechaActualInventario(fecha = new Date()): string {
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

export function esFechaInventarioValida(
  valor: unknown,
  hoy = fechaActualInventario(),
): boolean {
  if (typeof valor !== 'string' || !PATRON_FECHA.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.toISOString().slice(0, 10) === valor &&
    valor <= hoy
  );
}

@ValidatorConstraint({ name: 'fechaInventario', async: false })
class FechaInventarioConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return esFechaInventarioValida(value);
  }

  defaultMessage(): string {
    return 'Ingrese una fecha válida, exacta (AAAA-MM-DD) y no futura';
  }
}

export function EsFechaInventario(
  opciones?: ValidationOptions,
): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      target: target.constructor,
      propertyName: String(propertyName),
      options: opciones,
      validator: FechaInventarioConstraint,
    });
  };
}

export function RangoFechasValido(
  opciones?: ValidationOptions,
): ClassDecorator {
  return (target) => {
    registerDecorator({
      target,
      propertyName: '',
      options: opciones,
      validator: {
        validate(_value: unknown, args: ValidationArguments): boolean {
          const objeto = args.object as { desde?: string; hasta?: string };
          return !objeto.desde || !objeto.hasta || objeto.desde <= objeto.hasta;
        },
        defaultMessage: () =>
          'La fecha desde no puede ser posterior a la fecha hasta',
      },
    });
  };
}
