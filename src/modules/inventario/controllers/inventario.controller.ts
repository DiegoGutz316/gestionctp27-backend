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
import { InventarioService } from '../services/inventario.service';
import { RequierePermiso } from '../../auth/decorators/requiere-permiso.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { CrearCategoriaInsumoDto } from '../dto/crear-categoria-insumo.dto';
import { CrearInsumoDto } from '../dto/crear-insumo.dto';
import { EditarInsumoDto } from '../dto/editar-insumo.dto';
import { FiltrarInsumosDto } from '../dto/filtrar-insumos.dto';

/**
 * Backlog 1.6: cierra el TODO(Feature 1 - auth) que quedó abierto en los
 * backlogs 4.1-4.3. Consultar exige LECTURA sobre INVENTARIO y registrar o
 * editar exige COMPLETO, según la matriz de `permisos_rol`.
 *
 * Con la matriz sembrada: administrador y ambos docentes pueden registrar y
 * editar; directora y estudiante solo consultan.
 */
@ApiTags('Inventario')
@ApiCookieAuth('cookie')
@Controller('inventario')
@RequierePermiso(ModuloSistema.INVENTARIO, NivelPermiso.COMPLETO)
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @ApiOperation({ summary: 'Listar categorías de insumo activas' })
  @Get('categorias')
  @RequierePermiso(ModuloSistema.INVENTARIO, NivelPermiso.LECTURA)
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
  @RequierePermiso(ModuloSistema.INVENTARIO, NivelPermiso.LECTURA)
  listarInsumos(@Query() filtros: FiltrarInsumosDto) {
    return this.inventarioService.listarInsumos(filtros);
  }

  @ApiOperation({ summary: 'Registrar un insumo' })
  @Post('insumos')
  crearInsumo(@Body() dto: CrearInsumoDto) {
    return this.inventarioService.crearInsumo(dto);
  }

  @ApiOperation({ summary: 'Consultar un insumo por id' })
  @Get('insumos/:id')
  @RequierePermiso(ModuloSistema.INVENTARIO, NivelPermiso.LECTURA)
  obtenerInsumo(@Param('id', ParseIntPipe) id: number) {
    return this.inventarioService.obtenerInsumo(id);
  }

  @ApiOperation({ summary: 'Editar un insumo existente' })
  @Patch('insumos/:id')
  editarInsumo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditarInsumoDto,
  ) {
    return this.inventarioService.actualizarInsumo(id, dto);
  }
}
