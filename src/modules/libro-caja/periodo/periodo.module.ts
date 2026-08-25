import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartamentoCaja } from '../departamento/entities/departamento-caja.entity';
import { LibroCajaPolicy } from '../libro-caja.policy';
import { FondoCaja } from './entities/fondo-caja.entity';
import { PeriodoCaja } from './entities/periodo-caja.entity';
import { PeriodoController } from './periodo.controller';
import { PeriodoService } from './periodo.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PeriodoCaja, FondoCaja, DepartamentoCaja]),
  ],
  controllers: [PeriodoController],
  providers: [PeriodoService, LibroCajaPolicy],
})
export class PeriodoModule {}
