import { registerDecorator, type ValidationOptions } from 'class-validator';
import { DECIMALES_PERMITIDOS } from './limites-numericos';

export function TieneDecimalesPermitidos(opciones?: ValidationOptions) {
  return function (objeto: object, propiedad: string) {
    registerDecorator({
      name: 'tieneDecimalesPermitidos',
      target: objeto.constructor,
      propertyName: propiedad,
      options: opciones,
      validator: {
        validate(valor: unknown): boolean {
          if (typeof valor !== 'number' || !Number.isFinite(valor)) return true;
          return Number(valor.toFixed(DECIMALES_PERMITIDOS)) === valor;
        },
      },
    });
  };
}
