/**
 * Módulos del sistema sobre los que se otorgan permisos (Backlog 1.6).
 * Coinciden con las Features 1-6 del documento de Azure DevOps, más
 * Libro de Caja como módulo independiente de inventario.
 */
export enum ModuloSistema {
  PANEL = 'PANEL',
  USUARIOS = 'USUARIOS',
  PECUARIA = 'PECUARIA',
  AGRICOLA = 'AGRICOLA',
  INVENTARIO = 'INVENTARIO',
  LIBRO_CAJA = 'LIBRO_CAJA',
  REPORTES = 'REPORTES',
}

/** Etiquetas legibles para mensajes de acceso denegado y pantallas. */
export const ETIQUETA_MODULO: Record<ModuloSistema, string> = {
  [ModuloSistema.PANEL]: 'Panel principal',
  [ModuloSistema.USUARIOS]: 'Administración de usuarios',
  [ModuloSistema.PECUARIA]: 'Gestión pecuaria',
  [ModuloSistema.AGRICOLA]: 'Gestión agrícola',
  [ModuloSistema.INVENTARIO]: 'Inventario e insumos',
  [ModuloSistema.LIBRO_CAJA]: 'Libro de caja',
  [ModuloSistema.REPORTES]: 'Reportes',
};
