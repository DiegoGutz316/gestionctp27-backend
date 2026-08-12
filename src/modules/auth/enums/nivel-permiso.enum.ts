/**
 * Nivel de acceso de un rol sobre un modulo (Backlog 1.6).
 *
 * Es una escala ordenada: COMPLETO incluye lo que permite LECTURA. La funcion
 * `cubre` centraliza esa comparacion para no repetir la jerarquia en cada
 * guard o componente.
 */
export enum NivelPermiso {
  NINGUNO = 'NINGUNO',
  LECTURA = 'LECTURA',
  COMPLETO = 'COMPLETO',
}

const JERARQUIA: Record<NivelPermiso, number> = {
  [NivelPermiso.NINGUNO]: 0,
  [NivelPermiso.LECTURA]: 1,
  [NivelPermiso.COMPLETO]: 2,
};

/** true si `nivelAsignado` alcanza (o supera) el `nivelRequerido`. */
export function cubre(
  nivelAsignado: NivelPermiso,
  nivelRequerido: NivelPermiso,
): boolean {
  return JERARQUIA[nivelAsignado] >= JERARQUIA[nivelRequerido];
}
