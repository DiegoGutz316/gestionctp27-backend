import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequierePermiso } from '../auth/decorators/requiere-permiso.decorator';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { ModuloSistema } from '../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../auth/enums/nivel-permiso.enum';
import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';

import { DesparasitacionService } from './desparasitacion.service';
import { CrearDesparasitacionDto } from './dto/crear-desparasitacion.dto';

/**
 * El prefijo es el del modulo, como en `StockController`, para poder colgar la
 * consulta del backlog 2.8 debajo del animal sin cambiar la URL del registro
 * del backlog 2.7.
 */
@ApiTags('Pecuaria - Desparasitaciones')
@ApiCookieAuth('cookie')
@Controller('pecuaria')
@RequierePermiso(ModuloSistema.PECUARIA, NivelPermiso.COMPLETO)
export class DesparasitacionController {
  constructor(
    private readonly desparasitacionService: DesparasitacionService,
  ) {}

  @ApiOperation({
    summary: 'Registrar una desparasitación',
  })
  @Post('desparasitaciones')
  crear(
    @Body() dto: CrearDesparasitacionDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.desparasitacionService.crear(dto, actor);
  }

  /**
   * Backlog 2.8. Consultar es de solo lectura, asi que basta LECTURA: quien
   * puede ver pecuaria ve el historial aunque no pueda registrar.
   */
  @ApiOperation({
    summary: 'Consultar las desparasitaciones de un animal',
  })
  @Get('animales/:animalId/desparasitaciones')
  @RequierePermiso(ModuloSistema.PECUARIA, NivelPermiso.LECTURA)
  listarPorAnimal(@Param('animalId', ParseIntPipe) animalId: number) {
    return this.desparasitacionService.listarPorAnimal(animalId);
  }
}
