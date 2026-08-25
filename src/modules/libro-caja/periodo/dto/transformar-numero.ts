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
