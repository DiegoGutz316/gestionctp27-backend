import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

import type {
  DocumentoExportacion,
  SeccionExportacion,
} from './tipos/exportacion-reporte';

@Injectable()
export class ReportePdfService {
  generar(documento: DocumentoExportacion): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const pdf = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 35,
      });

      const partes: Buffer[] = [];

      pdf.on('data', (parte: Buffer) => {
        partes.push(parte);
      });

      pdf.on('end', () => {
        resolve(Buffer.concat(partes));
      });

      pdf.on('error', reject);

      pdf.font('Helvetica-Bold').fontSize(18).text(documento.titulo, {
        align: 'center',
      });

      pdf.moveDown();

      pdf.font('Helvetica').fontSize(10);

      for (const filtro of documento.filtros) {
        pdf.text(`${filtro.etiqueta}: ${filtro.valor}`);
      }

      pdf.moveDown();

      for (const seccion of documento.secciones) {
        this.escribirSeccion(pdf, seccion);
      }

      pdf.end();
    });
  }

  private escribirSeccion(
    pdf: PDFKit.PDFDocument,
    seccion: SeccionExportacion,
  ): void {
    if (pdf.y > 500) {
      pdf.addPage();
    }

    pdf.font('Helvetica-Bold').fontSize(13).text(seccion.titulo);

    pdf.moveDown(0.5);

    if (seccion.filas.length === 0) {
      pdf.font('Helvetica').fontSize(10).text('Sin registros.');

      pdf.moveDown();

      return;
    }

    const anchoDisponible =
      pdf.page.width - pdf.page.margins.left - pdf.page.margins.right;

    const anchoColumna = anchoDisponible / seccion.columnas.length;

    const altoFila = 22;

    this.escribirFila(
      pdf,
      seccion.columnas.map((columna) => columna.titulo),
      anchoColumna,
      altoFila,
      true,
    );

    for (const fila of seccion.filas) {
      if (pdf.y + altoFila > pdf.page.height - pdf.page.margins.bottom) {
        pdf.addPage();

        this.escribirFila(
          pdf,
          seccion.columnas.map((columna) => columna.titulo),
          anchoColumna,
          altoFila,
          true,
        );
      }

      this.escribirFila(
        pdf,
        seccion.columnas.map((columna) => {
          const valor = fila[columna.clave];

          return valor === null || valor === undefined ? '—' : String(valor);
        }),
        anchoColumna,
        altoFila,
        false,
      );
    }

    pdf.moveDown();
  }

  private escribirFila(
    pdf: PDFKit.PDFDocument,
    valores: string[],
    anchoColumna: number,
    altoFila: number,
    encabezado: boolean,
  ): void {
    const inicioX = pdf.page.margins.left;

    const inicioY = pdf.y;

    pdf.font(encabezado ? 'Helvetica-Bold' : 'Helvetica');

    pdf.fontSize(8);

    valores.forEach((valor, indice) => {
      const x = inicioX + indice * anchoColumna;

      pdf.text(valor, x + 3, inicioY + 5, {
        width: anchoColumna - 6,
        height: altoFila - 8,
        ellipsis: true,
      });
    });

    pdf.y = inicioY + altoFila;
  }
}
