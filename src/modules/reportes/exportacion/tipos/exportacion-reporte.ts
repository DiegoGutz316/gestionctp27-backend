export type ValorExportacion = string | number | null | undefined;

export interface ColumnaExportacion {
  clave: string;
  titulo: string;
  ancho?: number;
}

export type FilaExportacion = Record<string, ValorExportacion>;

export interface SeccionExportacion {
  titulo: string;
  columnas: ColumnaExportacion[];
  filas: FilaExportacion[];
}

export interface FiltroExportacion {
  etiqueta: string;
  valor: string;
}

export interface DocumentoExportacion {
  titulo: string;
  filtros: FiltroExportacion[];
  secciones: SeccionExportacion[];
}
