import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function esFechaIsoValida(valor: unknown): boolean {
  if (typeof valor !== 'string' || !PATRON_FECHA.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return (
    !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor
  );
}

@ValidatorConstraint({ name: 'fechaIso', async: false })
class FechaIsoConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return esFechaIsoValida(value);
  }

  defaultMessage(): string {
    return 'Ingrese una fecha válida en formato AAAA-MM-DD';
  }
}

export function EsFechaIso(opciones?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) => {
    registerDecorator({
      target: target.constructor,
      propertyName: String(propertyName),
      options: opciones,
      validator: FechaIsoConstraint,
    });
  };
}

export function RangoPeriodoValido(
  opciones?: ValidationOptions,
): ClassDecorator {
  return (target) => {
    registerDecorator({
      target,
      propertyName: '',
      options: opciones,
      validator: {
        validate(_value: unknown, args: ValidationArguments): boolean {
          const objeto = args.object as {
            fechaInicio?: string;
            fechaFin?: string;
          };
          return (
            !objeto.fechaInicio ||
            !objeto.fechaFin ||
            objeto.fechaInicio <= objeto.fechaFin
          );
        },
        defaultMessage: () =>
          'La fecha de inicio no puede ser posterior a la fecha de fin',
      },
    });
  };
}
