export enum CategoriaBovina {
  TORO = 'TORO',
  NOVILLA = 'NOVILLA',
  VACA = 'VACA',
  TERNERO = 'TERNERO',
  TORETE = 'TORETE',
}

export const ETIQUETA_CATEGORIA_BOVINA: Record<CategoriaBovina, string> = {
  [CategoriaBovina.TORO]: 'Toro',
  [CategoriaBovina.NOVILLA]: 'Novilla',
  [CategoriaBovina.VACA]: 'Vaca',
  [CategoriaBovina.TERNERO]: 'Ternero/a',
  [CategoriaBovina.TORETE]: 'Torete',
};

export const CATEGORIAS_BOVINAS_INVENTARIO = [
  CategoriaBovina.TORO,
  CategoriaBovina.NOVILLA,
  CategoriaBovina.VACA,
  CategoriaBovina.TERNERO,
  CategoriaBovina.TORETE,
] as const;
