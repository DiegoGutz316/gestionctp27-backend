import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsuarioActual } from '../../auth/decorators/usuario-actual.decorator';
import { RequierePermiso } from '../../auth/decorators/requiere-permiso.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { AsientoService } from './asiento.service';
import { CrearAsientoDto } from './dto/crear-asiento.dto';

@ApiTags('Libro de caja - Asientos')
@ApiCookieAuth('cookie')
@Controller('libro-caja/periodos/:periodoId/fondos/:fondoId/asientos')
@RequierePermiso(ModuloSistema.LIBRO_CAJA, NivelPermiso.COMPLETO)
export class AsientoController {
  constructor(private readonly asientoService: AsientoService) {}

  @Get()
  @RequierePermiso(ModuloSistema.LIBRO_CAJA, NivelPermiso.LECTURA)
  @ApiOperation({
    summary:
      'Listar asientos de ingresos y egresos de un departamento en un periodo',
  })
  listar(
    @Param('periodoId', ParseIntPipe) periodoId: number,
    @Param('fondoId', ParseIntPipe) fondoId: number,
  ) {
    return this.asientoService.listar(periodoId, fondoId);
  }

  @Post()
  @ApiOperation({
    summary: 'Registrar un asiento de ingreso o egreso en el libro de caja',
  })
  crear(
    @Param('periodoId', ParseIntPipe) periodoId: number,
    @Param('fondoId', ParseIntPipe) fondoId: number,
    @Body() dto: CrearAsientoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.asientoService.crear(periodoId, fondoId, dto, actor);
  }
}
