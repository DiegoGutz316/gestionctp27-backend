import { Body, Controller, Get, Post } from '@nestjs/common';
import { InventarioService } from '../services/inventario.service';
import { CrearCategoriaInsumoDto } from '../dto/crear-categoria-insumo.dto';
import { CrearInsumoDto } from '../dto/crear-insumo.dto';

// TODO(Feature 1 - auth): proteger estas rutas con el guard de autenticación
// y roles cuando exista el módulo de usuarios.
@Controller('inventario')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Get('categorias')
  listarCategorias() {
    return this.inventarioService.listarCategorias();
  }

  @Post('categorias')
  crearCategoria(@Body() dto: CrearCategoriaInsumoDto) {
    return this.inventarioService.crearCategoria(dto);
  }

  @Get('insumos')
  listarInsumos() {
    return this.inventarioService.listarInsumos();
  }

  @Post('insumos')
  crearInsumo(@Body() dto: CrearInsumoDto) {
    return this.inventarioService.crearInsumo(dto);
  }
}
