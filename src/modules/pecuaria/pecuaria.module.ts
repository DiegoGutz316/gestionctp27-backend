import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AnimalController } from './animal.controller';
import { AnimalService } from './animal.service';
import { DesparasitacionController } from './desparasitacion.controller';
import { DesparasitacionService } from './desparasitacion.service';
import { Animal } from './entities/animal.entity';
import { Desparasitacion } from './entities/desparasitacion.entity';
import { Vacuna } from './entities/vacuna.entity';
import { VacunaController } from './vacuna.controller';
import { VacunaService } from './vacuna.service';

@Module({
  imports: [TypeOrmModule.forFeature([Animal, Desparasitacion, Vacuna])],
  controllers: [AnimalController, DesparasitacionController, VacunaController],
  providers: [AnimalService, DesparasitacionService, VacunaService],
})
export class PecuariaModule {}
