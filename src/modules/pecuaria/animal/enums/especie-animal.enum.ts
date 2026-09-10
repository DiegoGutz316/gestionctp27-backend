export enum EspecieAnimal {
  VACA = 'VACA',
  CHANCHO = 'CHANCHO',
  GALLINA = 'GALLINA',
  POLLO = 'POLLO',
  CABRA = 'CABRA',
}

export const ETIQUETA_ESPECIE_ANIMAL: Record<EspecieAnimal, string> = {
  [EspecieAnimal.VACA]: 'Vaca',
  [EspecieAnimal.CHANCHO]: 'Chancho',
  [EspecieAnimal.GALLINA]: 'Gallina',
  [EspecieAnimal.POLLO]: 'Pollo',
  [EspecieAnimal.CABRA]: 'Cabra',
};

export function esEspecieAnimal(valor: string): valor is EspecieAnimal {
  return Object.values(EspecieAnimal).includes(valor as EspecieAnimal);
}
