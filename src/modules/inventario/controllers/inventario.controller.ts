import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventarioService } from '../services/inventario.service';
import { CrearCategoriaInsumoDto } from '../dto/crear-categoria-insumo.dto';
import { CrearInsumoDto } from '../dto/crear-insumo.dto';
import { FiltrarInsumosDto } from '../dto/filtrar-insumos.dto';

// TODO(Feature 1 - auth): proteger estas rutas con el guard de autenticación
// y roles cuando exista el módulo de usuarios.
@ApiTags('Inventario')
@Controller('inventario')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @ApiOperation({ summary: 'Listar categorías de insumo activas' })
  @Get('categorias')
  listarCategorias() {
    return this.inventarioService.listarCategorias();
  }

  @ApiOperation({ summary: 'Crear una categoría de insumo' })
  @Post('categorias')
  crearCategoria(@Body() dto: CrearCategoriaInsumoDto) {
    return this.inventarioService.crearCategoria(dto);
  }

  @ApiOperation({
    summary: 'Listar insumos activos (filtrable por nombre o categoría)',
  })
  @Get('insumos')
  listarInsumos(@Query() filtros: FiltrarInsumosDto) {
    return this.inventarioService.listarInsumos(filtros);
  }

  @ApiOperation({ summary: 'Registrar un insumo' })
  @Post('insumos')
  crearInsumo(@Body() dto: CrearInsumoDto) {
    return this.inventarioService.crearInsumo(dto);
  }
}

// hola 
