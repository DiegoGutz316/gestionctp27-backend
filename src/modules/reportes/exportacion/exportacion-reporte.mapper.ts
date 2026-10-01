import type { ConsultarReporteInventarioDto } from '../inventario/dto/consultar-reporte-inventario.dto';
import type { ReporteInventarioRespuesta } from '../inventario/respuestas/reporte-inventario.mapper';

import type { ConsultarReporteProduccionAgricolaDto } from '../produccion-agricola/dto/consultar-reporte-produccion-agricola.dto';
import type { ReporteProduccionAgricolaRespuesta } from '../produccion-agricola/respuestas/reporte-produccion-agricola.mapper';

import type { ConsultarReporteProduccionPecuariaDto } from '../produccion-pecuaria/dto/consultar-reporte-produccion-pecuaria.dto';
import type { ReporteProduccionPecuariaRespuesta } from '../produccion-pecuaria/respuestas/reporte-produccion-pecuaria.mapper';

import type { DocumentoExportacion } from './tipos/exportacion-reporte';

export function documentoProduccionPecuaria(
  dto: ConsultarReporteProduccionPecuariaDto,
  reporte: ReporteProduccionPecuariaRespuesta,
): DocumentoExportacion {
  return {
    titulo: 'Reporte de producción pecuaria',

    filtros: [
      {
        etiqueta: 'Animal',
        valor: `${reporte.animal.codigo} - ${reporte.animal.nombre}`,
      },
      {
        etiqueta: 'Fecha inicial',
        valor: dto.fechaInicio,
      },
      {
        etiqueta: 'Fecha final',
        valor: dto.fechaFin,
      },
    ],

    secciones: [
      {
        titulo: 'Producción',
        columnas: [
          {
            clave: 'fecha',
            titulo: 'Fecha',
            ancho: 15,
          },
          {
            clave: 'tipo',
            titulo: 'Tipo de producción',
            ancho: 25,
          },
          {
            clave: 'cantidad',
            titulo: 'Cantidad',
            ancho: 15,
          },
        ],
        filas: reporte.registros.map((registro) => ({
          fecha: registro.fecha,
          tipo: registro.tipoProduccion,
          cantidad: registro.cantidad,
        })),
      },
      {
        titulo: 'Totales',
        columnas: [
          {
            clave: 'tipo',
            titulo: 'Tipo de producción',
            ancho: 25,
          },
          {
            clave: 'cantidad',
            titulo: 'Cantidad',
            ancho: 15,
          },
        ],
        filas: reporte.totales.map((total) => ({
          tipo: total.tipoProduccion,
          cantidad: total.cantidad,
        })),
      },
    ],
  };
}

export function documentoProduccionAgricola(
  dto: ConsultarReporteProduccionAgricolaDto,
  reporte: ReporteProduccionAgricolaRespuesta,
): DocumentoExportacion {
  return {
    titulo: 'Reporte de producción agrícola',

    filtros: [
      {
        etiqueta: 'Cultivo',
        valor: dto.cultivo ?? 'Todos',
      },
      {
        etiqueta: 'Cama',
        valor: dto.camaId ? String(dto.camaId) : 'Todas',
      },
      {
        etiqueta: 'Fecha inicial',
        valor: dto.fechaInicio,
      },
      {
        etiqueta: 'Fecha final',
        valor: dto.fechaFin,
      },
    ],

    secciones: [
      {
        titulo: 'Siembras',
        columnas: [
          {
            clave: 'cultivo',
            titulo: 'Cultivo',
            ancho: 20,
          },
          {
            clave: 'cama',
            titulo: 'Cama',
            ancho: 15,
          },
          {
            clave: 'fecha',
            titulo: 'Fecha de siembra',
            ancho: 18,
          },
          {
            clave: 'cantidad',
            titulo: 'Cantidad sembrada',
            ancho: 20,
          },
        ],
        filas: reporte.siembras.map((siembra) => ({
          cultivo: siembra.tipoCultivo,
          cama: siembra.cama.codigo,
          fecha: siembra.fechaSiembra,
          cantidad: siembra.cantidadSembrada,
        })),
      },

      {
        titulo: 'Cosechas',
        columnas: [
          {
            clave: 'cultivo',
            titulo: 'Cultivo',
            ancho: 20,
          },
          {
            clave: 'cama',
            titulo: 'Cama',
            ancho: 15,
          },
          {
            clave: 'fecha',
            titulo: 'Fecha',
            ancho: 15,
          },
          {
            clave: 'cantidad',
            titulo: 'Cantidad',
            ancho: 15,
          },
          {
            clave: 'unidad',
            titulo: 'Unidad',
            ancho: 15,
          },
        ],
        filas: reporte.cosechas.map((cosecha) => ({
          cultivo: cosecha.siembra.tipoCultivo,
          cama: cosecha.siembra.cama.codigo,
          fecha: cosecha.fecha,
          cantidad: cosecha.cantidadObtenida,
          unidad: cosecha.unidadMedida,
        })),
      },

      {
        titulo: 'Tratamientos',
        columnas: [
          {
            clave: 'cultivo',
            titulo: 'Cultivo',
            ancho: 18,
          },
          {
            clave: 'cama',
            titulo: 'Cama',
            ancho: 12,
          },
          {
            clave: 'tipo',
            titulo: 'Tipo',
            ancho: 18,
          },
          {
            clave: 'producto',
            titulo: 'Producto',
            ancho: 25,
          },
          {
            clave: 'fecha',
            titulo: 'Fecha',
            ancho: 15,
          },
          {
            clave: 'cantidad',
            titulo: 'Cantidad',
            ancho: 15,
          },
          {
            clave: 'unidad',
            titulo: 'Unidad',
            ancho: 15,
          },
        ],
        filas: reporte.tratamientos.map((tratamiento) => ({
          cultivo: tratamiento.siembra.tipoCultivo,
          cama: tratamiento.siembra.cama.codigo,
          tipo: tratamiento.tipo,
          producto: tratamiento.producto,
          fecha: tratamiento.fecha,
          cantidad: tratamiento.cantidad,
          unidad: tratamiento.unidad,
        })),
      },

      {
        titulo: 'Totales de cosecha',
        columnas: [
          {
            clave: 'unidad',
            titulo: 'Unidad',
            ancho: 20,
          },
          {
            clave: 'cantidad',
            titulo: 'Cantidad total',
            ancho: 20,
          },
        ],
        filas: reporte.totales.cosechas.map((total) => ({
          unidad: total.unidadMedida,
          cantidad: total.cantidad,
        })),
      },
    ],
  };
}

export function documentoInventario(
  dto: ConsultarReporteInventarioDto,
  reporte: ReporteInventarioRespuesta,
): DocumentoExportacion {
  return {
    titulo: 'Reporte de inventario',

    filtros: [
      {
        etiqueta: 'Producto',
        valor: dto.productoId ? String(dto.productoId) : 'Todos',
      },
      {
        etiqueta: 'Categoría',
        valor: dto.tipoProducto ?? 'Todas',
      },
      {
        etiqueta: 'Fecha inicial',
        valor: dto.fechaInicio,
      },
      {
        etiqueta: 'Fecha final',
        valor: dto.fechaFin,
      },
    ],

    secciones: [
      {
        titulo: 'Inventario',
        columnas: [
          {
            clave: 'producto',
            titulo: 'Producto',
            ancho: 25,
          },
          {
            clave: 'categoria',
            titulo: 'Categoría',
            ancho: 18,
          },
          {
            clave: 'unidad',
            titulo: 'Unidad',
            ancho: 15,
          },
          {
            clave: 'entradas',
            titulo: 'Entradas',
            ancho: 15,
          },
          {
            clave: 'salidas',
            titulo: 'Salidas',
            ancho: 15,
          },
          {
            clave: 'existenciaFinal',
            titulo: 'Existencia final',
            ancho: 18,
          },
          {
            clave: 'saldoActual',
            titulo: 'Saldo actual',
            ancho: 18,
          },
        ],

        filas: reporte.registros.map((registro) => ({
          producto: registro.producto,
          categoria: registro.categoria,
          unidad: registro.unidadMedida,
          entradas: registro.entradas,
          salidas: registro.salidas,
          existenciaFinal: registro.existenciaFinal,
          saldoActual: registro.saldoActual,
        })),
      },
    ],
  };
}
