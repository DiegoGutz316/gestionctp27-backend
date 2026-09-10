import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AnimalController } from './animal/animal.controller';
import { AnimalService } from './animal/animal.service';
import { Animal } from './animal/entities/animal.entity';
import { ProduccionController } from './produccion/produccion.controller';
import { ProduccionPecuaria } from './produccion/entities/produccion-pecuaria.entity';
import { ProduccionService } from './produccion/produccion.service';
import { RegistroSalud } from './salud/entities/registro-salud.entity';
import { SaludController } from './salud/salud.controller';
import { SaludService } from './salud/salud.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Animal, ProduccionPecuaria, RegistroSalud]),
  ],
  controllers: [AnimalController, ProduccionController, SaludController],
  providers: [AnimalService, ProduccionService, SaludService],
})
export class PecuariaModule {}
