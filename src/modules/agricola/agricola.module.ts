import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CamaCultivoController } from './cama/cama-cultivo.controller';
import { CamaCultivoService } from './cama/cama-cultivo.service';
import { CamaCultivo } from './cama/entities/cama-cultivo.entity';
import { Siembra } from './siembra/entities/siembra.entity';
import { SiembraController } from './siembra/siembra.controller';
import { SiembraService } from './siembra/siembra.service';

@Module({
  imports: [TypeOrmModule.forFeature([CamaCultivo, Siembra])],
  controllers: [CamaCultivoController, SiembraController],
  providers: [CamaCultivoService, SiembraService],
})
export class AgricolaModule {}
