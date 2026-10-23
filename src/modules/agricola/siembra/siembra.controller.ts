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

import { RequierePermiso } from '../../auth/decorators/requiere-permiso.decorator';
import { UsuarioActual } from '../../auth/decorators/usuario-actual.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { ConsultarSiembrasDto } from './dto/consultar-siembras.dto';
import { FinalizarSiembraDto } from './dto/finalizar-siembra.dto';
import { RegistrarSiembraDto } from './dto/registrar-siembra.dto';
import { SiembraService } from './siembra.service';

@ApiTags('Agrícola - Siembras')
@ApiCookieAuth('cookie')
@Controller('agricola/siembras')
@RequierePermiso(ModuloSistema.AGRICOLA, NivelPermiso.COMPLETO)
export class SiembraController {
  constructor(private readonly siembraService: SiembraService) {}

  @ApiOperation({ summary: 'Registrar una siembra' })
  @Post()
  registrar(
    @Body() dto: RegistrarSiembraDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.siembraService.registrar(dto, actor);
  }

  @ApiOperation({ summary: 'Finalizar el ciclo de una siembra' })
  @Patch(':id/finalizar')
  finalizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FinalizarSiembraDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.siembraService.finalizar(id, dto, actor);
  }

  @ApiOperation({ summary: 'Consultar siembras por cultivo o fecha' })
  @Get()
  @RequierePermiso(ModuloSistema.AGRICOLA, NivelPermiso.LECTURA)
  consultar(@Query() filtros: ConsultarSiembrasDto) {
    return this.siembraService.consultar(filtros);
  }

  @ApiOperation({
    summary: 'Historial completo de una siembra',
    description:
      'La siembra con sus cuidados, sus cosechas y los totales del ciclo.',
  })
  @Get(':id')
  @RequierePermiso(ModuloSistema.AGRICOLA, NivelPermiso.LECTURA)
  obtenerDetalle(@Param('id', ParseIntPipe) id: number) {
    return this.siembraService.obtenerDetalle(id);
  }
}
