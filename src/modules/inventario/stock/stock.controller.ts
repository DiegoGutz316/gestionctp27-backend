import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequierePermiso } from '../../auth/decorators/requiere-permiso.decorator';
import { UsuarioActual } from '../../auth/decorators/usuario-actual.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { ConsultarMovimientosDto } from './dto/consultar-movimientos.dto';
import { CrearInventarioDto } from './dto/crear-inventario.dto';
import { EditarInventarioDto } from './dto/editar-inventario.dto';
import { FiltrarInventarioDto } from './dto/filtrar-inventario.dto';
import { RegistrarEntradaDto } from './dto/registrar-entrada.dto';
import { RegistrarSalidaDto } from './dto/registrar-salida.dto';
import { IdempotencyKeyPipe } from './pipes/idempotency-key.pipe';
import { StockService } from './stock.service';

@ApiTags('Inventario')
@ApiCookieAuth('cookie')
@Controller('inventario')
@RequierePermiso(ModuloSistema.INVENTARIO, NivelPermiso.COMPLETO)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('configuracion-stock')
  @ApiOperation({ summary: 'Crear configuración e inventario inicial en cero' })
  crearConfiguracion(
    @Body() dto: CrearInventarioDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.stockService.crearConfiguracion(dto, actor);
  }

  @Get('configuracion-stock/:id')
  @RequierePermiso(ModuloSistema.INVENTARIO, NivelPermiso.LECTURA)
  obtenerConfiguracion(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.stockService.obtenerConfiguracion(id, actor);
  }

  @Patch('configuracion-stock/:id')
  actualizarConfiguracion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditarInventarioDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.stockService.actualizarConfiguracion(id, dto, actor);
  }

  @Get('existencias')
  @RequierePermiso(ModuloSistema.INVENTARIO, NivelPermiso.LECTURA)
  listarExistencias(
    @Query() filtros: FiltrarInventarioDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.stockService.listarExistencias(filtros, actor);
  }

  @Get('existencias/movimientos')
  @RequierePermiso(ModuloSistema.INVENTARIO, NivelPermiso.LECTURA)
  listarMovimientos(
    @Query() filtros: ConsultarMovimientosDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.stockService.listarMovimientos(filtros, actor);
  }

  @Get('existencias/:id')
  @RequierePermiso(ModuloSistema.INVENTARIO, NivelPermiso.LECTURA)
  obtenerExistencia(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.stockService.obtenerExistencia(id, actor);
  }

  @Post('existencias/:id/entradas')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  registrarEntrada(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarEntradaDto,
    @UsuarioActual() actor: UsuarioAutenticado,
    @Headers('idempotency-key') claveRecibida: string | undefined,
  ) {
    const clave = new IdempotencyKeyPipe().transform(claveRecibida);
    return this.stockService.registrarEntrada(id, dto, actor, clave);
  }

  @Post('existencias/:id/salidas')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  registrarSalida(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarSalidaDto,
    @UsuarioActual() actor: UsuarioAutenticado,
    @Headers('idempotency-key') claveRecibida: string | undefined,
  ) {
    const clave = new IdempotencyKeyPipe().transform(claveRecibida);
    return this.stockService.registrarSalida(id, dto, actor, clave);
  }
}
