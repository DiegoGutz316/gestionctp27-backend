import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AvisoController } from './aviso.controller';
import { AvisoService } from './aviso.service';
import { Aviso } from './entities/aviso.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Aviso])],
  controllers: [AvisoController],
  providers: [AvisoService],
  exports: [AvisoService],
})
export class ComunicacionModule {}
