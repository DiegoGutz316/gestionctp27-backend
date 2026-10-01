/**
 * Estado de un aviso institucional (Backlog 5.5).
 *
 * Un aviso inactivo no desaparece: deja de mostrarse a los usuarios generales
 * pero se conserva, porque el 5.7 contempla volver a activarlo.
 */
export enum EstadoAviso {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
}
