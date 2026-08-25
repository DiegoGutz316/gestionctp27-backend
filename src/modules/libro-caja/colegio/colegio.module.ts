import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibroCajaPolicy } from '../libro-caja.policy';
import { ColegioController } from './colegio.controller';
import { ColegioService } from './colegio.service';
import { InformacionColegio } from './entities/informacion-colegio.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InformacionColegio])],
  controllers: [ColegioController],
  providers: [ColegioService, LibroCajaPolicy],
})
export class ColegioModule {}
