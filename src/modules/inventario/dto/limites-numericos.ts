/**
 * Límites de las columnas `numeric(12,2)` del módulo de inventario:
 * `insumos.cantidad`, `insumos.nivel_minimo` y
 * `movimientos_inventario.cantidad`.
 *
 * Sin estos topes en los DTOs, Postgres es quien rechaza el valor y la petición
 * termina en un 500:
 *  - Un número con más de 2 decimales se redondea al guardar. Además de guardar
 *    algo distinto de lo que se pidió, un valor como 0.001 se convierte en 0.00
 *    y viola el CHECK de cantidad > 0.
 *  - Un número mayor que el máximo desborda la columna (error 22003).
 *
 * Validarlos aquí hace que una petición malformada reciba un 400 con un mensaje
 * claro antes de abrir la transacción.
 */

/** numeric(12,2) admite 10 dígitos enteros y 2 decimales. */
export const VALOR_MAXIMO = 9999999999.99;

export const DECIMALES_PERMITIDOS = 2;

/** Texto del máximo para los mensajes de error, con separador de miles. */
export const VALOR_MAXIMO_TEXTO = VALOR_MAXIMO.toLocaleString('es-CR', {
  minimumFractionDigits: 2,
});
