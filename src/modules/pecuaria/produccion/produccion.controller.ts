import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequierePermiso } from '../../auth/decorators/requiere-permiso.decorator';
import { UsuarioActual } from '../../auth/decorators/usuario-actual.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { ConsultarProduccionDto } from './dto/consultar-produccion.dto';
import { RegistrarProduccionDto } from './dto/registrar-produccion.dto';
import { ProduccionService } from './produccion.service';

@ApiTags('Pecuaria - Producción')
@ApiCookieAuth('cookie')
@Controller('pecuaria/produccion')
@RequierePermiso(ModuloSistema.PECUARIA, NivelPermiso.COMPLETO)
export class ProduccionController {
  constructor(private readonly produccionService: ProduccionService) {}

  @ApiOperation({
    summary: 'Registrar producción pecuaria',
  })
  @Post()
  registrar(
    @Body() dto: RegistrarProduccionDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.produccionService.registrar(dto, actor);
  }

  @ApiOperation({
    summary: 'Consultar producción pecuaria de un animal',
  })
  @Get()
  @RequierePermiso(ModuloSistema.PECUARIA, NivelPermiso.LECTURA)
  consultar(@Query() dto: ConsultarProduccionDto) {
    return this.produccionService.consultar(dto);
  }
}
