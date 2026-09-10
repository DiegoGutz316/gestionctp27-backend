/**
 * Regla unica de "animal activo" para todo el modulo de pecuaria.
 *
 * El animal no tiene un campo `activo`: la baja logica se marca poniendo
 * `estado` en INACTIVO. Como `estado` es texto libre (los DTO de registro y
 * edicion solo validan longitud), la comparacion no puede distinguir
 * mayusculas: un animal guardado como "inactivo" tambien esta dado de baja.
 *
 * Vive aparte para que la definicion no quede repetida entre el listado de
 * animales y el registro de desparasitaciones, que es como se cuelan las
 * incoherencias.
 */
export const ESTADO_INACTIVO = 'INACTIVO';

/** Comprobacion en memoria, para un animal ya cargado. */
export function estaInactivo(estado: string): boolean {
  return estado.trim().toUpperCase() === ESTADO_INACTIVO;
}

/**
 * Misma comprobacion, pero en SQL. Espera que la consulta reciba el parametro
 * `inactivo` con el valor de `ESTADO_INACTIVO`.
 */
export function condicionAnimalActivo(alias: string): string {
  return `lower(${alias}.estado) != lower(:inactivo)`;
}
