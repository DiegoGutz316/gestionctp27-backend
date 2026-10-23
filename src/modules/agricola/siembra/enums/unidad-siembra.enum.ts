/**
 * Unidad en la que se mide lo que se siembra.
 *
 * No reutiliza la unidad de los tratamientos porque alli hay litros y
 * mililitros, que no aplican a semilla o plantula. Lo que se siembra se cuenta
 * (semillas, plantulas) o se pesa (un sobre de semilla a granel).
 */
export enum UnidadSiembra {
  UNIDADES = 'UNIDADES',
  G = 'G',
  KG = 'KG',
}

export const ETIQUETA_UNIDAD_SIEMBRA: Record<UnidadSiembra, string> = {
  [UnidadSiembra.UNIDADES]: 'Unidades',
  [UnidadSiembra.G]: 'Gramos',
  [UnidadSiembra.KG]: 'Kilogramos',
};
