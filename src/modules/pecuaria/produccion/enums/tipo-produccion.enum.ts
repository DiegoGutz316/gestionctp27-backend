import { EspecieAnimal } from '../../animal/enums/especie-animal.enum';

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

export const PRODUCCION_POR_ESPECIE: Record<EspecieAnimal, TipoProduccion[]> = {
  [EspecieAnimal.VACA]: [TipoProduccion.LECHE, TipoProduccion.CARNE],
  [EspecieAnimal.CHANCHO]: [TipoProduccion.CARNE],
  [EspecieAnimal.GALLINA]: [TipoProduccion.HUEVOS, TipoProduccion.CARNE],
  [EspecieAnimal.POLLO]: [TipoProduccion.CARNE],
  [EspecieAnimal.CABRA]: [TipoProduccion.LECHE, TipoProduccion.CARNE],
};

export function tiposProduccionDeEspecie(especie: string): TipoProduccion[] {
  const clave = especie.trim().toUpperCase() as EspecieAnimal;
  return PRODUCCION_POR_ESPECIE[clave] ?? [TipoProduccion.CARNE];
}

export function admiteTipoProduccion(
  especie: string,
  tipo: TipoProduccion,
): boolean {
  return tiposProduccionDeEspecie(especie).includes(tipo);
}
