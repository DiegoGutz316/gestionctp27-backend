import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QaUsabEvidencia } from './entities/qa-usab-evidencia.entity';
import { QaUsabHistorial } from './entities/qa-usab-historial.entity';
import { QaUsabParticipante } from './entities/qa-usab-participante.entity';
import { QaUsabSesion } from './entities/qa-usab-sesion.entity';
import { QaUsabilidadHabilitadoGuard } from './guards/qa-usabilidad-habilitado.guard';
import { QaUsabilidadController } from './qa-usabilidad.controller';
import { QaUsabilidadService } from './qa-usabilidad.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QaUsabParticipante,
      QaUsabSesion,
      QaUsabEvidencia,
      QaUsabHistorial,
    ]),
  ],
  controllers: [QaUsabilidadController],
  providers: [QaUsabilidadService, QaUsabilidadHabilitadoGuard],
})
export class QaUsabilidadModule {}
