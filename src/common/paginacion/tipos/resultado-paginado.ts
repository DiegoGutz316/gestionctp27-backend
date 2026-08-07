/**
 * Metadatos de una respuesta paginada.
 */
export interface MetaPaginacion {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
  tieneAnterior: boolean;
  tieneSiguiente: boolean;
}

/**
 * Forma estándar de las respuestas de listados paginados.
 */
export interface ResultadoPaginado<T> {
  datos: T[];
  meta: MetaPaginacion;
}

/**
 * Opciones mínimas para calcular skip/take.
 */
export interface OpcionesPaginacion {
  pagina: number;
  limite: number;
}
