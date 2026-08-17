import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { RequierePermiso } from '../../auth/decorators/requiere-permiso.decorator';
import { UsuarioActual } from '../../auth/decorators/usuario-actual.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { CrearInventarioDto } from './dto/crear-inventario.dto';
import { EditarInventarioDto } from './dto/editar-inventario.dto';
import { FiltrarInventarioDto } from './dto/filtrar-inventario.dto';
import { RegistrarEntradaDto } from './dto/registrar-entrada.dto';
import { RegistrarSalidaDto } from './dto/registrar-salida.dto';
import { ConsultarMovimientosDto } from './dto/consultar-movimientos.dto';

@ApiTags('Inventario - Stock')
@ApiCookieAuth('cookie')
@Controller('inventario/stock')
@RequierePermiso(ModuloSistema.INVENTARIO, NivelPermiso.COMPLETO)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @ApiOperation({ summary: 'Listar registros de inventario (filtrable)' })
  @Get()
  @RequierePermiso(ModuloSistema.INVENTARIO, NivelPermiso.LECTURA)
  listar(@Query() filtros: FiltrarInventarioDto) {
    return this.stockService.listar(filtros);
  }

  @ApiOperation({
    summary: 'Crear la configuración de stock de un producto (existencia 0)',
  })
  @Post()
  crear(@Body() dto: CrearInventarioDto) {
    return this.stockService.crear(dto);
  }

  // Declarada antes de ':id' para que Nest no confunda "movimientos" con un id.
  @ApiOperation({
    summary: 'Consultar el historial de movimientos (paginado y filtrable)',
  })
  @Get('movimientos')
  @RequierePermiso(ModuloSistema.INVENTARIO, NivelPermiso.LECTURA)
  listarMovimientos(@Query() filtros: ConsultarMovimientosDto) {
    return this.stockService.listarMovimientos(filtros);
  }

  @ApiOperation({ summary: 'Consultar un registro de inventario por id' })
  @Get(':id')
  @RequierePermiso(ModuloSistema.INVENTARIO, NivelPermiso.LECTURA)
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.obtener(id);
  }

  @ApiOperation({
    summary: 'Editar la configuración de stock (no modifica la existencia)',
  })
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditarInventarioDto,
  ) {
    return this.stockService.actualizar(id, dto);
  }

  @ApiOperation({
    summary: 'Registrar una entrada de stock (suma a la existencia)',
  })
  @Post(':id/entradas')
  registrarEntrada(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarEntradaDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.stockService.registrarEntrada(id, dto, actor);
  }

  @ApiOperation({
    summary: 'Registrar una salida de stock (resta a la existencia)',
  })
  @Post(':id/salidas')
  registrarSalida(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarSalidaDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.stockService.registrarSalida(id, dto, actor);
  }
}
