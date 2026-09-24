import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Animal } from '../pecuaria/animal/entities/animal.entity';
import { ProduccionPecuaria } from '../pecuaria/produccion/entities/produccion-pecuaria.entity';

import { Cosecha } from '../agricola/cosecha/entities/cosecha.entity';
import { Siembra } from '../agricola/siembra/entities/siembra.entity';
import { TratamientoAgricola } from '../agricola/tratamiento/entities/tratamiento-agricola.entity';

import { ReporteProduccionPecuariaController } from './produccion-pecuaria/reporte-produccion-pecuaria.controller';
import { ReporteProduccionPecuariaService } from './produccion-pecuaria/reporte-produccion-pecuaria.service';

import { ReporteProduccionAgricolaController } from './produccion-agricola/reporte-produccion-agricola.controller';
import { ReporteProduccionAgricolaService } from './produccion-agricola/reporte-produccion-agricola.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Animal,
      ProduccionPecuaria,
      Siembra,
      Cosecha,
      TratamientoAgricola,
    ]),
  ],
  controllers: [
    ReporteProduccionPecuariaController,
    ReporteProduccionAgricolaController,
  ],
  providers: [ReporteProduccionPecuariaService, ReporteProduccionAgricolaService],
})
export class ReportesModule {}
