import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequierePermiso } from '../../auth/decorators/requiere-permiso.decorator';
import { UsuarioActual } from '../../auth/decorators/usuario-actual.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';

import { ConsultarTratamientosDto } from './dto/consultar-tratamientos.dto';
import { RegistrarTratamientoDto } from './dto/registrar-tratamiento.dto';
import { TratamientoService } from './tratamiento.service';

@ApiTags('Agrícola - Tratamientos')
@ApiCookieAuth('cookie')
@Controller('agricola/tratamientos')
@RequierePermiso(ModuloSistema.AGRICOLA, NivelPermiso.COMPLETO)
export class TratamientoController {
  constructor(private readonly tratamientoService: TratamientoService) {}

  @ApiOperation({
    summary: 'Registrar fertilizante o tratamiento agrícola',
  })
  @Post()
  registrar(
    @Body()
    dto: RegistrarTratamientoDto,

    @UsuarioActual()
    actor: UsuarioAutenticado,
  ) {
    return this.tratamientoService.registrar(dto, actor);
  }

  @ApiOperation({
    summary: 'Consultar tratamientos de siembras activas',
  })
  @Get()
  @RequierePermiso(ModuloSistema.AGRICOLA, NivelPermiso.LECTURA)
  consultar(
    @Query()
    filtros: ConsultarTratamientosDto,
  ) {
    return this.tratamientoService.consultar(filtros);
  }
}
