export enum CondicionSalud {
  SANO = 'SANO',
  ENFERMO = 'ENFERMO',
  HERIDO = 'HERIDO',
  EN_TRATAMIENTO = 'EN_TRATAMIENTO',
  RECUPERACION = 'RECUPERACION',
}

export const ETIQUETA_CONDICION_SALUD: Record<CondicionSalud, string> = {
  [CondicionSalud.SANO]: 'Sano',
  [CondicionSalud.ENFERMO]: 'Enfermo',
  [CondicionSalud.HERIDO]: 'Herido',
  [CondicionSalud.EN_TRATAMIENTO]: 'En tratamiento',
  [CondicionSalud.RECUPERACION]: 'En recuperación',
};
