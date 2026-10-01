import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';

import {
  ApiCookieAuth,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';

import type { Response } from 'express';

import { RequierePermiso } from '../../auth/decorators/requiere-permiso.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';

import { ConsultarReporteInventarioDto } from '../inventario/dto/consultar-reporte-inventario.dto';
import { ReporteInventarioService } from '../inventario/reporte-inventario.service';

import { ConsultarReporteProduccionAgricolaDto } from '../produccion-agricola/dto/consultar-reporte-produccion-agricola.dto';
import { ReporteProduccionAgricolaService } from '../produccion-agricola/reporte-produccion-agricola.service';

import { ConsultarReporteProduccionPecuariaDto } from '../produccion-pecuaria/dto/consultar-reporte-produccion-pecuaria.dto';
import { ReporteProduccionPecuariaService } from '../produccion-pecuaria/reporte-produccion-pecuaria.service';

import {
  documentoInventario,
  documentoProduccionAgricola,
  documentoProduccionPecuaria,
} from './exportacion-reporte.mapper';

import { ReporteExcelService } from './reporte-excel.service';
import { ReportePdfService } from './reporte-pdf.service';

@ApiTags('Reportes - Exportación')
@ApiCookieAuth('cookie')
@Controller('reportes/exportacion')
@RequierePermiso(ModuloSistema.REPORTES, NivelPermiso.LECTURA)
export class ExportacionReportesController {
  constructor(
    private readonly pecuaria: ReporteProduccionPecuariaService,

    private readonly agricola: ReporteProduccionAgricolaService,

    private readonly inventario: ReporteInventarioService,

    private readonly pdf: ReportePdfService,

    private readonly excel: ReporteExcelService,
  ) {}

  @Get('produccion-pecuaria/pdf')
  @ApiOperation({
    summary: 'Exportar reporte de producción pecuaria a PDF',
  })
  @ApiProduces('application/pdf')
  async pecuariaPdf(
    @Query()
    dto: ConsultarReporteProduccionPecuariaDto,

    @Res({ passthrough: true })
    response: Response,
  ) {
    const reporte = await this.pecuaria.generar(dto);

    const archivo = await this.pdf.generar(
      documentoProduccionPecuaria(dto, reporte),
    );

    this.prepararRespuesta(
      response,
      archivo,
      `reporte-produccion-pecuaria-${dto.fechaInicio}-${dto.fechaFin}.pdf`,
      'application/pdf',
    );

    return new StreamableFile(archivo);
  }

  @Get('produccion-pecuaria/excel')
  @ApiOperation({
    summary: 'Exportar reporte de producción pecuaria a Excel',
  })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async pecuariaExcel(
    @Query()
    dto: ConsultarReporteProduccionPecuariaDto,

    @Res({ passthrough: true })
    response: Response,
  ) {
    const reporte = await this.pecuaria.generar(dto);

    const archivo = await this.excel.generar(
      documentoProduccionPecuaria(dto, reporte),
    );

    this.prepararRespuesta(
      response,
      archivo,
      `reporte-produccion-pecuaria-${dto.fechaInicio}-${dto.fechaFin}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    return new StreamableFile(archivo);
  }

  @Get('produccion-agricola/pdf')
  @ApiOperation({
    summary: 'Exportar reporte de producción agrícola a PDF',
  })
  @ApiProduces('application/pdf')
  async agricolaPdf(
    @Query()
    dto: ConsultarReporteProduccionAgricolaDto,

    @Res({ passthrough: true })
    response: Response,
  ) {
    const reporte = await this.agricola.generar(dto);

    const archivo = await this.pdf.generar(
      documentoProduccionAgricola(dto, reporte),
    );

    this.prepararRespuesta(
      response,
      archivo,
      `reporte-produccion-agricola-${dto.fechaInicio}-${dto.fechaFin}.pdf`,
      'application/pdf',
    );

    return new StreamableFile(archivo);
  }

  @Get('produccion-agricola/excel')
  @ApiOperation({
    summary: 'Exportar reporte de producción agrícola a Excel',
  })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async agricolaExcel(
    @Query()
    dto: ConsultarReporteProduccionAgricolaDto,

    @Res({ passthrough: true })
    response: Response,
  ) {
    const reporte = await this.agricola.generar(dto);

    const archivo = await this.excel.generar(
      documentoProduccionAgricola(dto, reporte),
    );

    this.prepararRespuesta(
      response,
      archivo,
      `reporte-produccion-agricola-${dto.fechaInicio}-${dto.fechaFin}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    return new StreamableFile(archivo);
  }

  @Get('inventario/pdf')
  @ApiOperation({
    summary: 'Exportar reporte de inventario a PDF',
  })
  @ApiProduces('application/pdf')
  async inventarioPdf(
    @Query()
    dto: ConsultarReporteInventarioDto,

    @Res({ passthrough: true })
    response: Response,
  ) {
    const reporte = await this.inventario.generar(dto);

    const archivo = await this.pdf.generar(documentoInventario(dto, reporte));

    this.prepararRespuesta(
      response,
      archivo,
      `reporte-inventario-${dto.fechaInicio}-${dto.fechaFin}.pdf`,
      'application/pdf',
    );

    return new StreamableFile(archivo);
  }

  @Get('inventario/excel')
  @ApiOperation({
    summary: 'Exportar reporte de inventario a Excel',
  })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async inventarioExcel(
    @Query()
    dto: ConsultarReporteInventarioDto,

    @Res({ passthrough: true })
    response: Response,
  ) {
    const reporte = await this.inventario.generar(dto);

    const archivo = await this.excel.generar(documentoInventario(dto, reporte));

    this.prepararRespuesta(
      response,
      archivo,
      `reporte-inventario-${dto.fechaInicio}-${dto.fechaFin}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    return new StreamableFile(archivo);
  }

  private prepararRespuesta(
    response: Response,
    archivo: Buffer,
    nombre: string,
    tipo: string,
  ): void {
    response.setHeader('Content-Type', tipo);

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${nombre}"`,
    );

    response.setHeader('Content-Length', String(archivo.length));
  }
}
