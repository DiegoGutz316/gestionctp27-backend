import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriaInsumo } from './entities/categoria-insumo.entity';
import { Insumo } from './entities/insumo.entity';
import { MovimientoInventario } from './entities/movimiento-inventario.entity';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CategoriaInsumo, Insumo, MovimientoInventario]),
  ],
  controllers: [InventarioController],
  providers: [InventarioService],
})
export class InventarioModule {}
