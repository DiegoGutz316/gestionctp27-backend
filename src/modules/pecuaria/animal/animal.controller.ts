import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequierePermiso } from '../../auth/decorators/requiere-permiso.decorator';
import { UsuarioActual } from '../../auth/decorators/usuario-actual.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';

import { AnimalService } from './animal.service';
import { CrearAnimalDto } from './dto/crear-animal.dto';
import { EditarAnimalDto } from './dto/editar-animal.dto';

@ApiTags('Pecuaria - Animales')
@ApiCookieAuth('cookie')
@Controller('pecuaria/animales')
@RequierePermiso(ModuloSistema.PECUARIA, NivelPermiso.COMPLETO)
export class AnimalController {
  constructor(private readonly animalService: AnimalService) {}

  @ApiOperation({
    summary: 'Registrar un animal',
  })
  @Post()
  crear(
    @Body() dto: CrearAnimalDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.animalService.crear(dto, actor);
  }

  @ApiOperation({
    summary: 'Consultar animales',
  })
  @Get()
  @RequierePermiso(ModuloSistema.PECUARIA, NivelPermiso.LECTURA)
  listar() {
    return this.animalService.listar();
  }

  @ApiOperation({
    summary: 'Consultar un animal por id',
  })
  @Get(':id')
  @RequierePermiso(ModuloSistema.PECUARIA, NivelPermiso.LECTURA)
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.animalService.obtener(id);
  }

  @ApiOperation({
    summary: 'Editar un animal',
  })
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditarAnimalDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.animalService.actualizar(id, dto, actor);
  }

  @ApiOperation({
    summary: 'Desactivar un animal',
  })
  @Patch(':id/desactivar')
  desactivar(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.animalService.desactivar(id, actor);
  }
}
