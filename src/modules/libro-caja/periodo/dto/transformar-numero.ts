import type { TransformFnParams } from 'class-transformer';

/** Convierte números enviados como texto sin aceptar campos vacíos como cero. */
export function transformarNumero({ value }: TransformFnParams): unknown {
  const valor: unknown = value;

  if (typeof valor === 'string' && valor.trim() === '') {
    return undefined;
  }

  if (typeof valor === 'string' || typeof valor === 'number') {
    return Number(valor);
  }

  return valor;
}

/** Convierte vacío, nulo o ausente a 0 (ingresos/egresos del asiento). */
export function transformarNumeroOCero({ value }: TransformFnParams): unknown {
  const valor: unknown = value;

  if (valor === undefined || valor === null) {
    return 0;
  }

  if (typeof valor === 'string' && valor.trim() === '') {
    return 0;
  }

  if (typeof valor === 'string' || typeof valor === 'number') {
    return Number(valor);
  }

  return valor;
}
