import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

import type {
  MetaPaginacion,
  OpcionesPaginacion,
  ResultadoPaginado,
} from '../tipos/resultado-paginado';

/**
 * Normaliza pagina/limite por si llegan undefined desde un DTO parcial.
 */
export function resolverOpcionesPaginacion(
  opciones: Partial<OpcionesPaginacion> = {},
): OpcionesPaginacion {
  const pagina =
    opciones.pagina && opciones.pagina > 0 ? Math.trunc(opciones.pagina) : 1;
  const limite =
    opciones.limite && opciones.limite > 0 ? Math.trunc(opciones.limite) : 10;

  return { pagina, limite };
}

/**
 * Convierte pagina (1-based) + limite a skip/take de TypeORM.
 */
export function obtenerSkipTake(opciones: Partial<OpcionesPaginacion>): {
  skip: number;
  take: number;
} {
  const { pagina, limite } = resolverOpcionesPaginacion(opciones);
  return {
    skip: (pagina - 1) * limite,
    take: limite,
  };
}

/**
 * Arma la meta a partir del total de registros y la página pedida.
 */
export function crearMetaPaginacion(
  opciones: Partial<OpcionesPaginacion>,
  total: number,
): MetaPaginacion {
  const { pagina, limite } = resolverOpcionesPaginacion(opciones);
  const totalSeguro = Math.max(0, Math.trunc(total));
  const totalPaginas = totalSeguro === 0 ? 0 : Math.ceil(totalSeguro / limite);
  const paginaActual = totalPaginas === 0 ? 1 : Math.min(pagina, totalPaginas);

  return {
    pagina: paginaActual,
    limite,
    total: totalSeguro,
    totalPaginas,
    tieneAnterior: paginaActual > 1,
    tieneSiguiente: totalPaginas > 0 && paginaActual < totalPaginas,
  };
}

/**
 * Envuelve una página de datos con su meta.
 */
export function crearResultadoPaginado<T>(
  datos: T[],
  opciones: Partial<OpcionesPaginacion>,
  total: number,
): ResultadoPaginado<T> {
  return {
    datos,
    meta: crearMetaPaginacion(opciones, total),
  };
}

/**
 * Aplica skip/take a un QueryBuilder y ejecuta getManyAndCount.
 */
export async function paginarQueryBuilder<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  opciones: Partial<OpcionesPaginacion>,
): Promise<{ entidades: T[]; total: number }> {
  const { skip, take } = obtenerSkipTake(opciones);
  const [entidades, total] = await query
    .skip(skip)
    .take(take)
    .getManyAndCount();
  return { entidades, total };
}
