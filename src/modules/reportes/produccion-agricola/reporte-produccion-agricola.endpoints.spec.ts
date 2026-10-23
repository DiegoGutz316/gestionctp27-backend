/* eslint-disable @typescript-eslint/no-unsafe-return -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - ReporteProduccionAgricolaController (módulo REPORTES)
 *
 *   GET /reportes/produccion-agricola?fechaInicio&fechaFin[&cultivo&camaId]  LECTURA
 */
import { probarEndpoints } from '../../../../test/helpers/tabla-endpoints';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { ReporteProduccionAgricolaController } from './reporte-produccion-agricola.controller';
import { ReporteProduccionAgricolaService } from './reporte-produccion-agricola.service';

const RUTA = '/reportes/produccion-agricola';

probarEndpoints({
  titulo: 'ReporteProduccionAgricolaController',
  controller: ReporteProduccionAgricolaController,
  servicioToken: ReporteProduccionAgricolaService,
  metodosServicio: ['generar'],
  casos: [
    {
      metodo: 'get',
      ruta: `${RUTA}?cultivo=Tomate&camaId=2&fechaInicio=2026-09-01&fechaFin=2026-09-30`,
      modulo: ModuloSistema.REPORTES,
      nivel: NivelPermiso.LECTURA,
      servicio: 'generar',
      respuesta: {
        siembras: [],
        cosechas: [],
        tratamientos: [],
        totales: { cosechas: [] },
      },
      argumentos: () => [
        expect.objectContaining({
          cultivo: 'Tomate',
          camaId: 2,
          fechaInicio: '2026-09-01',
          fechaFin: '2026-09-30',
        }),
      ],
      invalidos: [
        ['sin fechas', { ruta: RUTA }],
        [
          'rango invertido',
          { ruta: `${RUTA}?fechaInicio=2026-09-30&fechaFin=2026-09-01` },
        ],
        [
          'fecha futura',
          { ruta: `${RUTA}?fechaInicio=2026-09-01&fechaFin=2999-01-01` },
        ],
        [
          'camaId no numérico',
          {
            ruta: `${RUTA}?camaId=x&fechaInicio=2026-09-01&fechaFin=2026-09-30`,
          },
        ],
      ],
    },
  ],
});
