import type { TransformFnParams } from 'class-transformer';

export function transformarNumero({ value }: TransformFnParams): unknown {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || value.trim() === '') return value;

  return Number(value);
}
