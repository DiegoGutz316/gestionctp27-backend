import { Body, Controller, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequierePermiso } from '../auth/decorators/requiere-permiso.decorator';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { ModuloSistema } from '../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../auth/enums/nivel-permiso.enum';
import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';

import { DesparasitacionService } from './desparasitacion.service';
import { CrearDesparasitacionDto } from './dto/crear-desparasitacion.dto';

@ApiTags('Pecuaria - Desparasitaciones')
@ApiCookieAuth('cookie')
@Controller('pecuaria/desparasitaciones')
@RequierePermiso(ModuloSistema.PECUARIA, NivelPermiso.COMPLETO)
export class DesparasitacionController {
  constructor(
    private readonly desparasitacionService: DesparasitacionService,
  ) {}

  @ApiOperation({
    summary: 'Registrar una desparasitación',
  })
  @Post()
  crear(
    @Body() dto: CrearDesparasitacionDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.desparasitacionService.crear(dto, actor);
  }
}
