import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequierePermiso } from '../../auth/decorators/requiere-permiso.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';

import { ConsultarReporteProduccionPecuariaDto } from './dto/consultar-reporte-produccion-pecuaria.dto';
import { ReporteProduccionPecuariaService } from './reporte-produccion-pecuaria.service';

@ApiTags('Reportes - Producción pecuaria')
@ApiCookieAuth('cookie')
@Controller('reportes/produccion-pecuaria')
@RequierePermiso(ModuloSistema.REPORTES, NivelPermiso.LECTURA)
export class ReporteProduccionPecuariaController {
  constructor(
    private readonly reporteProduccionPecuariaService: ReporteProduccionPecuariaService,
  ) {}

  @ApiOperation({
    summary: 'Generar reporte de producción pecuaria por animal y período',
  })
  @Get()
  generar(@Query() dto: ConsultarReporteProduccionPecuariaDto) {
    return this.reporteProduccionPecuariaService.generar(dto);
  }
}
