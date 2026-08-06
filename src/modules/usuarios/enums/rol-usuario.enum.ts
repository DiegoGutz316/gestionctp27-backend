export enum RolUsuario {
  ADMINISTRADOR = 'ADMINISTRADOR',
  DIRECTORA = 'DIRECTORA',
  DOCENTE_PECUARIO = 'DOCENTE_PECUARIO',
  DOCENTE_AGRICOLA = 'DOCENTE_AGRICOLA',
  ESTUDIANTE = 'ESTUDIANTE',
}

/** Etiquetas legibles para mostrar en pantalla. */
export const ETIQUETA_ROL: Record<RolUsuario, string> = {
  [RolUsuario.ADMINISTRADOR]: 'Administrador',
  [RolUsuario.DIRECTORA]: 'Dirección',
  [RolUsuario.DOCENTE_PECUARIO]: 'Docente pecuario',
  [RolUsuario.DOCENTE_AGRICOLA]: 'Docente agrícola',
  [RolUsuario.ESTUDIANTE]: 'Estudiante',
};
