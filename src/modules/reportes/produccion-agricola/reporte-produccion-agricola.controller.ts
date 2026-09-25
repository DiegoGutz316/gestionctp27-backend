import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequierePermiso } from '../../auth/decorators/requiere-permiso.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';

import { ConsultarReporteProduccionAgricolaDto } from './dto/consultar-reporte-produccion-agricola.dto';
import { ReporteProduccionAgricolaService } from './reporte-produccion-agricola.service';

@ApiTags('Reportes - Producción agrícola')
@ApiCookieAuth('cookie')
@Controller('reportes/produccion-agricola')
@RequierePermiso(ModuloSistema.REPORTES, NivelPermiso.LECTURA)
export class ReporteProduccionAgricolaController {
  constructor(
    private readonly reporteProduccionAgricolaService: ReporteProduccionAgricolaService,
  ) {}

  @ApiOperation({
    summary:
      'Generar reporte de producción agrícola por cultivo, cama y período',
  })
  @Get()
  generar(@Query() dto: ConsultarReporteProduccionAgricolaDto) {
    return this.reporteProduccionAgricolaService.generar(dto);
  }
}
