import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequierePermiso } from '../../auth/decorators/requiere-permiso.decorator';
import { UsuarioActual } from '../../auth/decorators/usuario-actual.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { ConsultarSaludDto } from './dto/consultar-salud.dto';
import { RegistrarSaludDto } from './dto/registrar-salud.dto';
import { SaludService } from './salud.service';

@ApiTags('Pecuaria - Salud')
@ApiCookieAuth('cookie')
@Controller('pecuaria/salud')
@RequierePermiso(ModuloSistema.PECUARIA, NivelPermiso.COMPLETO)
export class SaludController {
  constructor(private readonly saludService: SaludService) {}

  @ApiOperation({
    summary: 'Registrar estado de salud de un animal',
  })
  @Post()
  registrar(
    @Body() dto: RegistrarSaludDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.saludService.registrar(dto, actor);
  }

  @ApiOperation({
    summary: 'Consultar historial de salud de un animal',
  })
  @Get()
  @RequierePermiso(ModuloSistema.PECUARIA, NivelPermiso.LECTURA)
  consultar(@Query() dto: ConsultarSaludDto) {
    return this.saludService.consultar(dto);
  }
}
