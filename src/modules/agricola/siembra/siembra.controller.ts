import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequierePermiso } from '../../auth/decorators/requiere-permiso.decorator';
import { UsuarioActual } from '../../auth/decorators/usuario-actual.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { ConsultarSiembrasDto } from './dto/consultar-siembras.dto';
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

  @ApiOperation({ summary: 'Consultar siembras por cultivo o fecha' })
  @Get()
  @RequierePermiso(ModuloSistema.AGRICOLA, NivelPermiso.LECTURA)
  consultar(@Query() filtros: ConsultarSiembrasDto) {
    return this.siembraService.consultar(filtros);
  }
}
