/**
 * Tipo de movimiento del historial de inventario.
 *
 * ENTRADA (backlog 4.4) suma al stock del insumo y SALIDA (backlog 4.6) resta.
 * Ambos comparten la misma tabla `movimientos_inventario`, como plantea el
 * documento de Azure DevOps: el 4.4 crea la tabla y el 4.6 solo agrega el otro
 * tipo de movimiento.
 */
export enum TipoMovimiento {
  ENTRADA = 'ENTRADA',
  SALIDA = 'SALIDA',
}
