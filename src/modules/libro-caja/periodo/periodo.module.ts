import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartamentoCaja } from '../departamento/entities/departamento-caja.entity';
import { LibroCajaPolicy } from '../libro-caja.policy';
import { AsientoController } from './asiento.controller';
import { AsientoService } from './asiento.service';
import { AsientoCaja } from './entities/asiento-caja.entity';
import { FondoCaja } from './entities/fondo-caja.entity';
import { IdempotenciaAsiento } from './entities/idempotencia-asiento.entity';
import { PeriodoCaja } from './entities/periodo-caja.entity';
import { PeriodoController } from './periodo.controller';
import { PeriodoService } from './periodo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PeriodoCaja,
      FondoCaja,
      DepartamentoCaja,
      AsientoCaja,
      IdempotenciaAsiento,
    ]),
  ],
  controllers: [PeriodoController, AsientoController],
  providers: [PeriodoService, AsientoService, LibroCajaPolicy],
})
export class PeriodoModule {}
