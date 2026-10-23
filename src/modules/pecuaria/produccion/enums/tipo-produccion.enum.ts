import {
  esEspecieAnimal,
  type EspecieAnimal,
} from '../../animal/enums/especie-animal.enum';

export enum TipoProduccion {
  LECHE = 'LECHE',
  HUEVOS = 'HUEVOS',
  CARNE = 'CARNE',
}

export const ETIQUETA_TIPO_PRODUCCION: Record<TipoProduccion, string> = {
  [TipoProduccion.LECHE]: 'Leche',
  [TipoProduccion.HUEVOS]: 'Huevos',
  [TipoProduccion.CARNE]: 'Carne',
};

export const UNIDAD_TIPO_PRODUCCION: Record<TipoProduccion, string> = {
  [TipoProduccion.LECHE]: 'L',
  [TipoProduccion.HUEVOS]: 'unid.',
  [TipoProduccion.CARNE]: 'kg',
};

/**
 * Regla unica de que tipos de produccion admite cada especie.
 *
 * Se escribe con texto y no con los miembros de los enums para poder copiarla
 * tal cual al frontend, donde especie y tipo son uniones de literales: en los
 * dos lados `${EspecieAnimal}` y `${TipoProduccion}` son la misma union de
 * valores, y el `Record` obliga a declarar cada especie nueva.
 */
export const TIPOS_PRODUCCION_POR_ESPECIE: Record<
  `${EspecieAnimal}`,
  readonly `${TipoProduccion}`[]
> = {
  VACA: ['LECHE', 'CARNE'],
  CABRA: ['LECHE'],
  GALLINA: ['HUEVOS', 'CARNE'],
  POLLO: ['CARNE'],
  CHANCHO: ['CARNE'],
};

/**
 * `especie` es texto libre en la tabla de animales, asi que se compara sin
 * distinguir mayusculas ni espacios. Una especie desconocida no admite ninguno.
 */
export function esProduccionCompatible(
  especie: string,
  tipo: TipoProduccion,
): boolean {
  const clave = especie.trim().toUpperCase();

  return (
    esEspecieAnimal(clave) && TIPOS_PRODUCCION_POR_ESPECIE[clave].includes(tipo)
  );
}
