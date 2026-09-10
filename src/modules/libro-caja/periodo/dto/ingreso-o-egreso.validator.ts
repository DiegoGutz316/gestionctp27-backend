import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

function esMonto(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

export function esIngresoOEgresoExclusivo(objeto: {
  ingresos?: unknown;
  egresos?: unknown;
}): boolean {
  if (!esMonto(objeto.ingresos) || !esMonto(objeto.egresos)) {
    return true;
  }

  const hayIngreso = objeto.ingresos > 0;
  const hayEgreso = objeto.egresos > 0;
  return (
    (hayIngreso && objeto.egresos === 0) || (hayEgreso && objeto.ingresos === 0)
  );
}

export function IngresoOEgresoExclusivo(
  opciones?: ValidationOptions,
): ClassDecorator {
  return (target) => {
    registerDecorator({
      target,
      propertyName: '',
      options: opciones,
      validator: {
        validate(_value: unknown, args: ValidationArguments): boolean {
          return esIngresoOEgresoExclusivo(args.object);
        },
        defaultMessage: () =>
          'Indique un ingreso o un egreso, no ambos. El otro queda en 0.',
      },
    });
  };
}
