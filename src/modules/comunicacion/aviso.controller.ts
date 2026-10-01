import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequierePermiso } from '../auth/decorators/requiere-permiso.decorator';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { ModuloSistema } from '../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../auth/enums/nivel-permiso.enum';
import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';

import { AvisoService } from './aviso.service';
import { ConsultarAvisosDto } from './dto/consultar-avisos.dto';
import { RegistrarAvisoDto } from './dto/registrar-aviso.dto';

/**
 * Backlog 5.5 (Crear avisos institucionales).
 *
 * Los avisos son la mitad de "comunicacion" del Feature 5, asi que el permiso
 * que los gobierna es REPORTES: el enum de modulos sigue las Features del
 * documento, y esta es "Reportes y comunicacion institucional".
 */
@ApiTags('Comunicación - Avisos institucionales')
@ApiCookieAuth('cookie')
@Controller('comunicacion/avisos')
@RequierePermiso(ModuloSistema.REPORTES, NivelPermiso.COMPLETO)
export class AvisoController {
  constructor(private readonly avisoService: AvisoService) {}

  @ApiOperation({
    summary: 'Consultar los avisos institucionales activos',
    description: 'Solo devuelve los activos: los inactivos no se muestran.',
  })
  @Get()
  @RequierePermiso(ModuloSistema.REPORTES, NivelPermiso.LECTURA)
  consultar(@Query() filtros: ConsultarAvisosDto) {
    return this.avisoService.consultar(filtros);
  }

  @ApiOperation({ summary: 'Publicar un aviso institucional' })
  @Post()
  registrar(
    @Body() dto: RegistrarAvisoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.avisoService.registrar(dto, actor);
  }
}
