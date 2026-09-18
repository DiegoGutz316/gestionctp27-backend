import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequierePermiso } from '../../auth/decorators/requiere-permiso.decorator';
import { UsuarioActual } from '../../auth/decorators/usuario-actual.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';

import { CosechaService } from './cosecha.service';
import { ConsultarCosechasDto } from './dto/consultar-cosechas.dto';
import { RegistrarCosechaDto } from './dto/registrar-cosecha.dto';

@ApiTags('Agrícola - Cosechas')
@ApiCookieAuth('cookie')
@Controller('agricola/cosechas')
@RequierePermiso(ModuloSistema.AGRICOLA, NivelPermiso.COMPLETO)
export class CosechaController {
  constructor(private readonly cosechaService: CosechaService) {}

  @ApiOperation({ summary: 'Registrar una cosecha' })
  @Post()
  registrar(
    @Body() dto: RegistrarCosechaDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.cosechaService.registrar(dto, actor);
  }

  /**
   * Backlog 3.7. Consultar es de solo lectura, asi que basta LECTURA: la
   * directora y los estudiantes ven el historial aunque no puedan registrar.
   */
  @ApiOperation({ summary: 'Consultar cosechas por cultivo o fecha' })
  @Get()
  @RequierePermiso(ModuloSistema.AGRICOLA, NivelPermiso.LECTURA)
  consultar(@Query() filtros: ConsultarCosechasDto) {
    return this.cosechaService.consultar(filtros);
  }
}
