import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AnimalController } from './animal.controller';
import { AnimalService } from './animal.service';
import { DesparasitacionController } from './desparasitacion.controller';
import { DesparasitacionService } from './desparasitacion.service';
import { Animal } from './entities/animal.entity';
import { Desparasitacion } from './entities/desparasitacion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Animal, Desparasitacion])],
  controllers: [AnimalController, DesparasitacionController],
  providers: [AnimalService, DesparasitacionService],
})
export class PecuariaModule {}
