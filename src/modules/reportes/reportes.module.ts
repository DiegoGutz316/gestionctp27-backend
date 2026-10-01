import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Cosecha } from '../agricola/cosecha/entities/cosecha.entity';
import { Siembra } from '../agricola/siembra/entities/siembra.entity';
import { TratamientoAgricola } from '../agricola/tratamiento/entities/tratamiento-agricola.entity';

import { MovimientoStock } from '../inventario/stock/entities/movimiento-stock.entity';

import { Animal } from '../pecuaria/animal/entities/animal.entity';
import { ProduccionPecuaria } from '../pecuaria/produccion/entities/produccion-pecuaria.entity';

import { ExportacionReportesController } from './exportacion/exportacion-reportes.controller';
import { ReporteExcelService } from './exportacion/reporte-excel.service';
import { ReportePdfService } from './exportacion/reporte-pdf.service';

import { ReporteInventarioController } from './inventario/reporte-inventario.controller';
import { ReporteInventarioService } from './inventario/reporte-inventario.service';

import { ReporteProduccionAgricolaController } from './produccion-agricola/reporte-produccion-agricola.controller';
import { ReporteProduccionAgricolaService } from './produccion-agricola/reporte-produccion-agricola.service';

import { ReporteProduccionPecuariaController } from './produccion-pecuaria/reporte-produccion-pecuaria.controller';
import { ReporteProduccionPecuariaService } from './produccion-pecuaria/reporte-produccion-pecuaria.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Animal,
      ProduccionPecuaria,
      Siembra,
      Cosecha,
      TratamientoAgricola,
      MovimientoStock,
    ]),
  ],

  controllers: [
    ReporteProduccionPecuariaController,
    ReporteProduccionAgricolaController,
    ReporteInventarioController,
    ExportacionReportesController,
  ],

  providers: [
    ReporteProduccionPecuariaService,
    ReporteProduccionAgricolaService,
    ReporteInventarioService,
    ReportePdfService,
    ReporteExcelService,
  ],
})
export class ReportesModule {}
