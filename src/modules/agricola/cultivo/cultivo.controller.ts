import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequierePermiso } from '../../auth/decorators/requiere-permiso.decorator';
import { UsuarioActual } from '../../auth/decorators/usuario-actual.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { CultivoService } from './cultivo.service';
import { ConsultarCultivosDto } from './dto/consultar-cultivos.dto';
import { EditarCultivoDto } from './dto/editar-cultivo.dto';
import { RegistrarCultivoDto } from './dto/registrar-cultivo.dto';
import { mapearCultivo } from './respuestas/cultivo.mapper';

@ApiTags('Agrícola - Cultivos')
@ApiCookieAuth('cookie')
@Controller('agricola/cultivos')
@RequierePermiso(ModuloSistema.AGRICOLA, NivelPermiso.COMPLETO)
export class CultivoController {
  constructor(private readonly cultivoService: CultivoService) {}

  @ApiOperation({ summary: 'Registrar un cultivo en el catálogo' })
  @Post()
  registrar(
    @Body() dto: RegistrarCultivoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.cultivoService.registrar(dto, actor);
  }

  @ApiOperation({ summary: 'Obtener un cultivo' })
  @Get(':id')
  @RequierePermiso(ModuloSistema.AGRICOLA, NivelPermiso.LECTURA)
  async obtener(@Param('id', ParseIntPipe) id: number) {
    return mapearCultivo(await this.cultivoService.obtener(id));
  }

  @ApiOperation({ summary: 'Editar un cultivo del catálogo' })
  @Patch(':id')
  editar(@Param('id', ParseIntPipe) id: number, @Body() dto: EditarCultivoDto) {
    return this.cultivoService.editar(id, dto);
  }

  @ApiOperation({
    summary: 'Eliminar un cultivo',
    description: 'Solo si ninguna siembra lo usa; si no, responde 409.',
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.cultivoService.eliminar(id);
  }

  @ApiOperation({
    summary: 'Consultar los cultivos registrados',
    description: 'Con «soloActivos» devuelve los que se pueden sembrar hoy.',
  })
  @Get()
  @RequierePermiso(ModuloSistema.AGRICOLA, NivelPermiso.LECTURA)
  consultar(@Query() filtros: ConsultarCultivosDto) {
    return this.cultivoService.consultar(filtros);
  }
}
