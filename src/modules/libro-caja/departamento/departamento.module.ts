import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibroCajaPolicy } from '../libro-caja.policy';
import { FondoCaja } from '../periodo/entities/fondo-caja.entity';
import { PeriodoCaja } from '../periodo/entities/periodo-caja.entity';
import { DepartamentoController } from './departamento.controller';
import { DepartamentoService } from './departamento.service';
import { DepartamentoCaja } from './entities/departamento-caja.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DepartamentoCaja, PeriodoCaja, FondoCaja]),
  ],
  controllers: [DepartamentoController],
  providers: [DepartamentoService, LibroCajaPolicy],
  exports: [TypeOrmModule],
})
export class DepartamentoModule {}
