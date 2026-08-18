/**
 * Límites de las columnas `numeric(12,2)` de `inventario` (cantidad,
 * stock_minimo, precio). Sin estos topes en los DTOs, Postgres es quien
 * rechaza el valor y la petición termina en un 500.
 */

/** numeric(12,2) admite 10 dígitos enteros y 2 decimales. */
export const VALOR_MAXIMO = 9999999999.99;

export const DECIMALES_PERMITIDOS = 2;

/** Texto del máximo para los mensajes de error, con separador de miles. */
export const VALOR_MAXIMO_TEXTO = VALOR_MAXIMO.toLocaleString('es-CR', {
  minimumFractionDigits: 2,
});
