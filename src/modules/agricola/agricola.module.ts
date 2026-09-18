import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CamaCultivoController } from './cama/cama-cultivo.controller';
import { CamaCultivoService } from './cama/cama-cultivo.service';
import { CamaCultivo } from './cama/entities/cama-cultivo.entity';

import { Siembra } from './siembra/entities/siembra.entity';
import { SiembraController } from './siembra/siembra.controller';
import { SiembraService } from './siembra/siembra.service';

import { TratamientoAgricola } from './tratamiento/entities/tratamiento-agricola.entity';
import { TratamientoController } from './tratamiento/tratamiento.controller';
import { TratamientoService } from './tratamiento/tratamiento.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CamaCultivo, Siembra, TratamientoAgricola]),
  ],
  controllers: [
    CamaCultivoController,
    SiembraController,
    TratamientoController,
  ],
  providers: [CamaCultivoService, SiembraService, TratamientoService],
})
export class AgricolaModule {}
