export enum EstadoAnimal {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
}

export const ETIQUETA_ESTADO_ANIMAL: Record<EstadoAnimal, string> = {
  [EstadoAnimal.ACTIVO]: 'Activo',
  [EstadoAnimal.INACTIVO]: 'Inactivo',
};

export function esAnimalActivo(estado: string): boolean {
  const activo: string = EstadoAnimal.ACTIVO;

  return estado.trim().toUpperCase() === activo;
}
