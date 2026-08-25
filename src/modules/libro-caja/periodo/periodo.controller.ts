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
import { UsuarioActual } from '../../auth/decorators/usuario-actual.decorator';
import { RequierePermiso } from '../../auth/decorators/requiere-permiso.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { AbrirPeriodoDto } from './dto/abrir-periodo.dto';
import { EditarPeriodoDto } from './dto/editar-periodo.dto';
import { FiltrarPeriodosDto } from './dto/filtrar-periodos.dto';
import { SolicitarFondoDto } from './dto/solicitar-fondo.dto';
import { PeriodoService } from './periodo.service';

@ApiTags('Libro de caja - Periodos')
@ApiCookieAuth('cookie')
@Controller('libro-caja/periodos')
@RequierePermiso(ModuloSistema.LIBRO_CAJA, NivelPermiso.COMPLETO)
export class PeriodoController {
  constructor(private readonly periodoService: PeriodoService) {}

  @Get()
  @RequierePermiso(ModuloSistema.LIBRO_CAJA, NivelPermiso.LECTURA)
  @ApiOperation({ summary: 'Listar periodos del libro de caja' })
  listar(@Query() filtros: FiltrarPeriodosDto) {
    return this.periodoService.listar(filtros);
  }

  @Post()
  @ApiOperation({
    summary:
      'Abrir un periodo e indicar a mano el fondo de cada departamento activo',
  })
  abrir(
    @Body() dto: AbrirPeriodoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.periodoService.abrir(dto, actor);
  }

  @Get(':id')
  @RequierePermiso(ModuloSistema.LIBRO_CAJA, NivelPermiso.LECTURA)
  @ApiOperation({
    summary: 'Consultar un periodo con los fondos de cada departamento',
  })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.periodoService.obtener(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar nombre y fechas de un periodo abierto' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditarPeriodoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.periodoService.actualizar(id, dto, actor);
  }

  @Post(':id/cerrar')
  @ApiOperation({ summary: 'Cerrar un periodo abierto' })
  cerrar(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.periodoService.cerrar(id, actor);
  }

  @Post(':id/fondos/:fondoId/solicitar')
  @ApiOperation({
    summary: 'Solicitar el fondo de caja inicial de un departamento',
  })
  solicitarFondo(
    @Param('id', ParseIntPipe) id: number,
    @Param('fondoId', ParseIntPipe) fondoId: number,
    @Body() dto: SolicitarFondoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.periodoService.solicitarFondo(id, fondoId, dto, actor);
  }
}
