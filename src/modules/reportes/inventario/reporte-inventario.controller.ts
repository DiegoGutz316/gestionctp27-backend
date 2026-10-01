import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequierePermiso } from '../../auth/decorators/requiere-permiso.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';

import { ConsultarReporteInventarioDto } from './dto/consultar-reporte-inventario.dto';
import { ReporteInventarioService } from './reporte-inventario.service';

@ApiTags('Reportes - Inventario')
@ApiCookieAuth('cookie')
@Controller('reportes/inventario')
@RequierePermiso(ModuloSistema.REPORTES, NivelPermiso.LECTURA)
export class ReporteInventarioController {
  constructor(
    private readonly reporteInventarioService: ReporteInventarioService,
  ) {}

  @ApiOperation({
    summary: 'Generar reporte de inventario por producto, categoría y período',
  })
  @Get()
  generar(
    @Query()
    dto: ConsultarReporteInventarioDto,
  ) {
    return this.reporteInventarioService.generar(dto);
  }
}
