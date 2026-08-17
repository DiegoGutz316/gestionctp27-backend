import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Producto } from './producto/entities/producto.entity';
import { Inventario } from './stock/entities/inventario.entity';
import { MovimientoStock } from './stock/entities/movimiento-stock.entity';
import { ProductoController } from './producto/producto.controller';
import { ProductoService } from './producto/producto.service';
import { StockController } from './stock/stock.controller';
import { StockService } from './stock/stock.service';
import { ConfiguracionStock } from './stock/entities/configuracion-stock.entity';
import { IdempotenciaMovimiento } from './stock/entities/idempotencia-movimiento.entity';
import { AuditoriaInventario } from './entities/auditoria-inventario.entity';
import { InventarioPolicy } from './inventario.policy';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Producto,
      ConfiguracionStock,
      Inventario,
      MovimientoStock,
      IdempotenciaMovimiento,
      AuditoriaInventario,
    ]),
  ],
  controllers: [ProductoController, StockController],
  providers: [ProductoService, StockService, InventarioPolicy],
})
export class InventarioModule {}
