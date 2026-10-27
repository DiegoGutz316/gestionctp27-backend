import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EspecialidadController } from './especialidad.controller';
import { EspecialidadLanding } from './entities/especialidad-landing.entity';
import { EspecialidadService } from './especialidad.service';

@Module({
  imports: [TypeOrmModule.forFeature([EspecialidadLanding])],
  controllers: [EspecialidadController],
  providers: [EspecialidadService],
  exports: [EspecialidadService],
})
export class LandingModule {}
