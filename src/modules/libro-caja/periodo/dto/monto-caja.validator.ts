import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';
import {
  DECIMALES_PERMITIDOS,
  VALOR_MAXIMO,
  VALOR_MAXIMO_TEXTO,
} from './limites-numericos';
import { esNumeroFinito } from './transformar-numero';

export function mensajeMontoCaja(campo: string, valor: unknown): string {
  if (!esNumeroFinito(valor)) {
    return `${campo} debe ser un número válido`;
  }
  if (valor < 0) {
    return `${campo} no puede ser negativo`;
  }
  if (valor > VALOR_MAXIMO) {
    return `${campo} no puede superar ${VALOR_MAXIMO_TEXTO}`;
  }
  if (Number(valor.toFixed(DECIMALES_PERMITIDOS)) !== valor) {
    return `${campo} admite como máximo 2 decimales`;
  }
  return `${campo} debe ser un número válido`;
}

export function esMontoCajaValido(valor: unknown): boolean {
  if (valor === undefined || valor === null) return true;
  if (!esNumeroFinito(valor)) return false;
  if (valor < 0 || valor > VALOR_MAXIMO) return false;
  return Number(valor.toFixed(DECIMALES_PERMITIDOS)) === valor;
}

export function MontoCaja(
  campo: string,
  opciones?: ValidationOptions,
): PropertyDecorator {
  return (objeto, propiedad) => {
    registerDecorator({
      name: 'montoCaja',
      target: objeto.constructor,
      propertyName: String(propiedad),
      options: opciones,
      validator: {
        validate(valor: unknown): boolean {
          return esMontoCajaValido(valor);
        },
        defaultMessage(args: ValidationArguments): string {
          return mensajeMontoCaja(campo, args.value);
        },
      },
    });
  };
}
