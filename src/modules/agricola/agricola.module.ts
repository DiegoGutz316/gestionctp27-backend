import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CamaCultivoController } from './cama/cama-cultivo.controller';
import { CamaCultivoService } from './cama/cama-cultivo.service';
import { CamaCultivo } from './cama/entities/cama-cultivo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CamaCultivo])],
  controllers: [CamaCultivoController],
  providers: [CamaCultivoService],
})
export class AgricolaModule {}
