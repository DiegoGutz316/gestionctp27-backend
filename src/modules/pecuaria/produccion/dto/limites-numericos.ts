/** Límites de la columna `numeric(12,2)` de producción pecuaria. */

export const VALOR_MAXIMO = 9999999999.99;

export const DECIMALES_PERMITIDOS = 2;

export const VALOR_MAXIMO_TEXTO = VALOR_MAXIMO.toLocaleString('es-CR', {
  minimumFractionDigits: 2,
});
