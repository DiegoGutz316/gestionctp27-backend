import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';

import type { DocumentoExportacion } from './tipos/exportacion-reporte';

@Injectable()
export class ReporteExcelService {
  async generar(documento: DocumentoExportacion): Promise<Buffer> {
    const libro = new ExcelJS.Workbook();

    libro.creator = 'GestiónCTP27';
    libro.created = new Date();

    for (const seccion of documento.secciones) {
      const hoja = libro.addWorksheet(seccion.titulo.slice(0, 31));

      hoja.addRow([documento.titulo]);

      hoja.getRow(1).font = {
        bold: true,
        size: 16,
      };

      for (const filtro of documento.filtros) {
        hoja.addRow([filtro.etiqueta, filtro.valor]);
      }

      hoja.addRow([]);

      const encabezados = seccion.columnas.map((columna) => columna.titulo);

      const filaEncabezados = hoja.addRow(encabezados);

      filaEncabezados.font = {
        bold: true,
      };

      for (const fila of seccion.filas) {
        hoja.addRow(
          seccion.columnas.map((columna) => fila[columna.clave] ?? ''),
        );
      }

      seccion.columnas.forEach((columna, indice) => {
        hoja.getColumn(indice + 1).width = columna.ancho ?? 18;
      });

      hoja.views = [
        {
          state: 'frozen',
          ySplit: documento.filtros.length + 3,
        },
      ];
    }

    const contenido = await libro.xlsx.writeBuffer();

    return Buffer.from(contenido);
  }
}
