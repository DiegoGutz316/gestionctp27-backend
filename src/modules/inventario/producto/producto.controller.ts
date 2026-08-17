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
import { ProductoService } from './producto.service';
import { RequierePermiso } from '../../auth/decorators/requiere-permiso.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { EditarProductoDto } from './dto/editar-producto.dto';
import { FiltrarProductosDto } from './dto/filtrar-productos.dto';

@ApiTags('Inventario - Productos')
@ApiCookieAuth('cookie')
@Controller('inventario/productos')
@RequierePermiso(ModuloSistema.INVENTARIO, NivelPermiso.COMPLETO)
export class ProductoController {
  constructor(private readonly productoService: ProductoService) {}

  @ApiOperation({ summary: 'Listar productos activos (filtrable)' })
  @Get()
  @RequierePermiso(ModuloSistema.INVENTARIO, NivelPermiso.LECTURA)
  listar(@Query() filtros: FiltrarProductosDto) {
    return this.productoService.listar(filtros);
  }

  @ApiOperation({ summary: 'Crear un producto' })
  @Post()
  crear(@Body() dto: CrearProductoDto) {
    return this.productoService.crear(dto);
  }

  @ApiOperation({ summary: 'Consultar un producto por id' })
  @Get(':id')
  @RequierePermiso(ModuloSistema.INVENTARIO, NivelPermiso.LECTURA)
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.productoService.obtener(id);
  }

  @ApiOperation({ summary: 'Editar un producto existente' })
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditarProductoDto,
  ) {
    return this.productoService.actualizar(id, dto);
  }
}
