import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AnimalController } from './animal/animal.controller';
import { AnimalService } from './animal/animal.service';
import { Animal } from './animal/entities/animal.entity';
import { Desparasitacion } from './animal/entities/desparasitacion.entity';
import { Vacuna } from './animal/entities/vacuna.entity';
import { DesparasitacionController } from './desparasitacion.controller';
import { DesparasitacionService } from './desparasitacion.service';
import { ProduccionController } from './produccion/produccion.controller';
import { ProduccionPecuaria } from './produccion/entities/produccion-pecuaria.entity';
import { ProduccionService } from './produccion/produccion.service';
import { RegistroSalud } from './salud/entities/registro-salud.entity';
import { SaludController } from './salud/salud.controller';
import { SaludService } from './salud/salud.service';
import { VacunaController } from './vacuna.controller';
import { VacunaService } from './vacuna.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Animal,
      Desparasitacion,
      Vacuna,
      ProduccionPecuaria,
      RegistroSalud,
    ]),
  ],
  controllers: [
    AnimalController,
    DesparasitacionController,
    VacunaController,
    ProduccionController,
    SaludController,
  ],
  providers: [
    AnimalService,
    DesparasitacionService,
    VacunaService,
    ProduccionService,
    SaludService,
  ],
})
export class PecuariaModule {}
