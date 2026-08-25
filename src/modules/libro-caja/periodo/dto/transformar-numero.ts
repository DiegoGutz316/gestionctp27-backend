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

/** Convierte vacío o ausente en 0 (columnas de ingresos/egresos). */
export function transformarNumeroOCero({ value }: TransformFnParams): unknown {
  if (value === undefined || value === null) {
    return 0;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return 0;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return Number(value);
  }

  return value;
}
