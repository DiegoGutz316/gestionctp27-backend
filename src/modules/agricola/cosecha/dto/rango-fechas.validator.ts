import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

/**
 * Comprueba que `desde` no sea posterior a `hasta`.
 *
 * Es una regla entre dos campos, asi que no puede vivir en ninguno de los dos:
 * va como decorador de la clase.
 *
 * Mismo criterio que el `RangoFechasValido` del modulo de inventario. Se deja
 * una copia local a proposito en vez de compartir una sola: unificarlas
 * obligaria a tocar un modulo ajeno por una regla de tres lineas.
 */
export function RangoFechasValido(
  opciones?: ValidationOptions,
): ClassDecorator {
  return (target) => {
    registerDecorator({
      target,
      propertyName: '',
      options: opciones,
      validator: {
        /**
         * Las fechas son AAAA-MM-DD, formato en el que el orden alfabetico
         * coincide con el cronologico. Con un solo extremo no hay rango que
         * comprobar: cada campo ya se valida por su cuenta.
         */
        validate(_valor: unknown, args: ValidationArguments): boolean {
          const objeto = args.object as { desde?: string; hasta?: string };

          return !objeto.desde || !objeto.hasta || objeto.desde <= objeto.hasta;
        },

        defaultMessage: () =>
          'La fecha inicial no puede ser posterior a la fecha final',
      },
    });
  };
}
