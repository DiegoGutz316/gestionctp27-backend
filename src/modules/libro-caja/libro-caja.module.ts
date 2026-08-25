import { Module } from '@nestjs/common';
import { ColegioModule } from './colegio/colegio.module';
import { DepartamentoModule } from './departamento/departamento.module';
import { PeriodoModule } from './periodo/periodo.module';

/**
 * Libro de caja: módulo de dominio propio, independiente de inventario.
 * Agrupa los submódulos de colegio, departamentos y periodos.
 */
@Module({
  imports: [ColegioModule, DepartamentoModule, PeriodoModule],
})
export class LibroCajaModule {}
