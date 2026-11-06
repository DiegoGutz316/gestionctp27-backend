export enum EstadoAsiento {
  VIGENTE = 'VIGENTE',
  ANULADO = 'ANULADO',
}

export const ETIQUETA_ESTADO_ASIENTO: Record<EstadoAsiento, string> = {
  [EstadoAsiento.VIGENTE]: 'Vigente',
  [EstadoAsiento.ANULADO]: 'Anulado',
};
