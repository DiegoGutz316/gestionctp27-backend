import type { TipoProducto } from '../../../inventario/producto/enums/tipo-producto.enum';
import type { UnidadMedida } from '../../../inventario/producto/enums/unidad-medida.enum';

export interface ReporteInventarioItem {
  inventarioId: number;
  productoId: number;
  producto: string;
  categoria: TipoProducto;
  unidadMedida: UnidadMedida;
  entradas: number;
  salidas: number;
  existenciaFinal: number;
  saldoActual: number;
}

export interface ReporteInventarioRespuesta {
  fechaInicio: string;
  fechaFin: string;
  registros: ReporteInventarioItem[];
}

export interface FilaReporteInventario {
  inventarioId: string;
  productoId: string;
  producto: string;
  categoria: TipoProducto;
  unidadMedida: UnidadMedida;
  entradas: string;
  salidas: string;
  existenciaFinal: string;
  saldoActual: string;
}

export function mapearReporteInventario(
  fechaInicio: string,
  fechaFin: string,
  filas: FilaReporteInventario[],
): ReporteInventarioRespuesta {
  return {
    fechaInicio,
    fechaFin,
    registros: filas.map((fila) => ({
      inventarioId: Number(fila.inventarioId),
      productoId: Number(fila.productoId),
      producto: fila.producto,
      categoria: fila.categoria,
      unidadMedida: fila.unidadMedida,
      entradas: Number(fila.entradas),
      salidas: Number(fila.salidas),
      existenciaFinal: Number(fila.existenciaFinal),
      saldoActual: Number(fila.saldoActual),
    })),
  };
}
