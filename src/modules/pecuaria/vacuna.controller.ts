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

import { CrearVacunaDto } from './animal/dto/crear-vacuna.dto';
import { VacunaService } from './vacuna.service';

@ApiTags('Pecuaria - Vacunas')
@ApiCookieAuth('cookie')
@Controller('pecuaria/vacunas')
@RequierePermiso(ModuloSistema.PECUARIA, NivelPermiso.COMPLETO)
export class VacunaController {
  constructor(private readonly vacunaService: VacunaService) {}

  @ApiOperation({
    summary: 'Registrar una vacuna',
  })
  @Post()
  crear(
    @Body() dto: CrearVacunaDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.vacunaService.crear(dto, actor);
  }

  @ApiOperation({
    summary: 'Consultar las vacunas de un animal',
  })
  @Get('animal/:animalId')
  @RequierePermiso(ModuloSistema.PECUARIA, NivelPermiso.LECTURA)
  listarPorAnimal(@Param('animalId', ParseIntPipe) animalId: number) {
    return this.vacunaService.listarPorAnimal(animalId);
  }
}
