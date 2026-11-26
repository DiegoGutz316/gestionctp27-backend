export enum ResultadoUsab {
  COMPLETADA_SIN_AYUDA = 'COMPLETADA_SIN_AYUDA',
  COMPLETADA_CON_DIFICULTAD = 'COMPLETADA_CON_DIFICULTAD',
  COMPLETADA_CON_AYUDA = 'COMPLETADA_CON_AYUDA',
  NO_COMPLETADA = 'NO_COMPLETADA',
  BLOQUEADA_POR_ENTORNO = 'BLOQUEADA_POR_ENTORNO',
}

export const ETIQUETA_RESULTADO_USAB: Record<ResultadoUsab, string> = {
  [ResultadoUsab.COMPLETADA_SIN_AYUDA]: 'Completada sin ayuda',
  [ResultadoUsab.COMPLETADA_CON_DIFICULTAD]: 'Completada con dificultad',
  [ResultadoUsab.COMPLETADA_CON_AYUDA]: 'Completada con ayuda',
  [ResultadoUsab.NO_COMPLETADA]: 'No completada',
  [ResultadoUsab.BLOQUEADA_POR_ENTORNO]: 'Bloqueada por problema técnico',
};

export enum EstadoSesionUsab {
  BORRADOR = 'BORRADOR',
  FINALIZADA = 'FINALIZADA',
}
