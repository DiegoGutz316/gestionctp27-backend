import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

import { UnidadMedida } from '../enums/unidad-medida.enum';

/**
 * Medido en unidades, la cantidad tiene que ser entera: media lechuga no se
 * cosecha. En kilos si admite decimales.
 *
 * Es una regla entre dos campos, asi que va como decorador de la clase.
 */
export function CantidadEnteraEnUnidades(
  opciones?: ValidationOptions,
): ClassDecorator {
  return (target) => {
    registerDecorator({
      target,
      propertyName: '',
      options: opciones,
      validator: {
        validate(_valor: unknown, args: ValidationArguments): boolean {
          const objeto = args.object as {
            unidadMedida?: string;
            cantidadObtenida?: unknown;
          };

          if (objeto.unidadMedida !== UnidadMedida.UNIDADES) return true;

          // Si la cantidad ni siquiera es un numero, el error lo explica su
          // propio validador: aqui no se duplica el mensaje.
          if (
            typeof objeto.cantidadObtenida !== 'number' ||
            !Number.isFinite(objeto.cantidadObtenida)
          ) {
            return true;
          }

          return Number.isInteger(objeto.cantidadObtenida);
        },

        defaultMessage: () =>
          'Medida en unidades, la cantidad debe ser un número entero',
      },
    });
  };
}
