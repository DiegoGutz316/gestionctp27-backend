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

import { CamaCultivoService } from './cama-cultivo.service';
import { CrearCamaCultivoDto } from './dto/crear-cama-cultivo.dto';
import { EditarCamaCultivoDto } from './dto/editar-cama-cultivo.dto';
import { FiltrarCamasCultivoDto } from './dto/filtrar-camas-cultivo.dto';

@ApiTags('Agrícola - Camas de cultivo')
@ApiCookieAuth('cookie')
@Controller('agricola/camas')
@RequierePermiso(ModuloSistema.AGRICOLA, NivelPermiso.COMPLETO)
export class CamaCultivoController {
  constructor(private readonly camaCultivoService: CamaCultivoService) {}

  @ApiOperation({
    summary: 'Registrar una cama de cultivo',
  })
  @Post()
  crear(
    @Body() dto: CrearCamaCultivoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.camaCultivoService.crear(dto, actor);
  }

  @ApiOperation({
    summary: 'Consultar camas de cultivo',
  })
  @Get()
  @RequierePermiso(ModuloSistema.AGRICOLA, NivelPermiso.LECTURA)
  listar(@Query() filtros: FiltrarCamasCultivoDto) {
    return this.camaCultivoService.listar(filtros);
  }

  @ApiOperation({
    summary: 'Consultar una cama de cultivo por id',
  })
  @Get(':id')
  @RequierePermiso(ModuloSistema.AGRICOLA, NivelPermiso.LECTURA)
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.camaCultivoService.obtener(id);
  }

  @ApiOperation({
    summary: 'Eliminar una cama de cultivo',
    description:
      'Solo si nunca se usó: una cama con siembras registradas responde 409.',
  })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.camaCultivoService.eliminar(id);
  }

  @ApiOperation({
    summary: 'Editar una cama de cultivo',
  })
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditarCamaCultivoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.camaCultivoService.actualizar(id, dto, actor);
  }
}
