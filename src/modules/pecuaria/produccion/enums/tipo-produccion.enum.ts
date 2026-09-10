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
