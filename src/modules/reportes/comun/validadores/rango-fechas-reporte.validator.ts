import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

/**
 * Comprueba que `fechaInicio` no sea posterior a `fechaFin`.
 *
 * Es una regla entre dos campos, asi que no puede vivir en ninguno de los
 * dos: va como decorador de la clase.
 *
 * Mismo criterio que `RangoFechasValido` del modulo de cosechas
 * (src/modules/agricola/cosecha/dto/rango-fechas.validator.ts). Se deja una
 * copia local a proposito, con los nombres de campo que usan los reportes
 * (`fechaInicio`/`fechaFin` en vez de `desde`/`hasta`): unificarlas obligaria
 * a tocar un modulo ajeno por una regla de tres lineas.
 */
export function RangoFechasReporteValido(
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
         * coincide con el cronologico.
         */
        validate(_valor: unknown, args: ValidationArguments): boolean {
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
          'La fecha inicial no puede ser posterior a la fecha final',
      },
    });
  };
}
