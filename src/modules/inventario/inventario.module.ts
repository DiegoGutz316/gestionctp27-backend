import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriaInsumo } from './entities/categoria-insumo.entity';
import { Insumo } from './entities/insumo.entity';
import { InventarioController } from './controllers/inventario.controller';
import { InventarioService } from './services/inventario.service';

@Module({
  imports: [TypeOrmModule.forFeature([CategoriaInsumo, Insumo])],
  controllers: [InventarioController],
  providers: [InventarioService],
})
export class InventarioModule {}
