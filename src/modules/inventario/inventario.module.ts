import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Producto } from './producto/entities/producto.entity';
import { Inventario } from './stock/entities/inventario.entity';
import { MovimientoStock } from './stock/entities/movimiento-stock.entity';
import { ProductoController } from './producto/producto.controller';
import { ProductoService } from './producto/producto.service';
import { StockController } from './stock/stock.controller';
import { StockService } from './stock/stock.service';

@Module({
  imports: [TypeOrmModule.forFeature([Producto, Inventario, MovimientoStock])],
  controllers: [ProductoController, StockController],
  providers: [ProductoService, StockService],
})
export class InventarioModule {}
