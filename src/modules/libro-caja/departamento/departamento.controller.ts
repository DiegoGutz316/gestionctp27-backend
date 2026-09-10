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
import { DepartamentoService } from './departamento.service';
import { CrearDepartamentoDto } from './dto/crear-departamento.dto';
import { EditarDepartamentoDto } from './dto/editar-departamento.dto';
import { FiltrarDepartamentosDto } from './dto/filtrar-departamentos.dto';

@ApiTags('Libro de caja - Departamentos')
@ApiCookieAuth('cookie')
@Controller('libro-caja/departamentos')
@RequierePermiso(ModuloSistema.LIBRO_CAJA, NivelPermiso.COMPLETO)
export class DepartamentoController {
  constructor(private readonly departamentoService: DepartamentoService) {}

  @Get()
  @RequierePermiso(ModuloSistema.LIBRO_CAJA, NivelPermiso.LECTURA)
  @ApiOperation({
    summary: 'Listar departamentos (unidades) del libro de caja',
  })
  listar(@Query() filtros: FiltrarDepartamentosDto) {
    return this.departamentoService.listar(filtros);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar un departamento' })
  crear(
    @Body() dto: CrearDepartamentoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.departamentoService.crear(dto, actor);
  }

  @Get(':id')
  @RequierePermiso(ModuloSistema.LIBRO_CAJA, NivelPermiso.LECTURA)
  @ApiOperation({ summary: 'Consultar un departamento por id' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.departamentoService.obtener(id);
  }

  @Patch(':id/desactivar')
  @ApiOperation({ summary: 'Desactivar un departamento (eliminación lógica)' })
  desactivar(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.departamentoService.desactivar(id, actor);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar nombre de unidad y tipo de actividad' })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditarDepartamentoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.departamentoService.actualizar(id, dto, actor);
  }
}
