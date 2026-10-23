import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

import {
  ActividadAgricola,
  usaProducto,
} from '../enums/actividad-agricola.enum';

type CuidadoParcial = {
  actividad?: ActividadAgricola;
  producto?: unknown;
  cantidad?: unknown;
  unidad?: unknown;
};

/**
 * El producto depende de la actividad: fertilizar y tratar lo exigen con su
 * cantidad y su unidad; regar y limpiar no lo admiten.
 *
 * Es una regla entre varios campos, asi que va como decorador de la clase. Se
 * registran dos validadores en vez de uno para poder dar el mensaje que
 * corresponde en cada caso: falta un dato, o sobra.
 */
export function ProductoSegunActividad(
  opciones?: ValidationOptions,
): ClassDecorator {
  return (target) => {
    registerDecorator({
      target,
      propertyName: '',
      options: opciones,
      validator: {
        validate(_valor: unknown, args: ValidationArguments): boolean {
          const objeto = args.object as CuidadoParcial;
          if (!objeto.actividad || !usaProducto(objeto.actividad)) return true;

          // Cada campo tiene su propio validador para el formato; aqui solo
          // importa que esten presentes.
          return (
            objeto.producto !== undefined &&
            objeto.cantidad !== undefined &&
            objeto.unidad !== undefined
          );
        },

        defaultMessage: () =>
          'Al fertilizar o aplicar un tratamiento, indique el producto, la cantidad y la unidad',
      },
    });

    registerDecorator({
      target,
      propertyName: ' ',
      options: opciones,
      validator: {
        validate(_valor: unknown, args: ValidationArguments): boolean {
          const objeto = args.object as CuidadoParcial;
          if (!objeto.actividad || usaProducto(objeto.actividad)) return true;

          return (
            objeto.producto === undefined &&
            objeto.cantidad === undefined &&
            objeto.unidad === undefined
          );
        },

        defaultMessage: () =>
          'Un riego o una limpieza no llevan producto ni cantidad',
      },
    });
  };
}
