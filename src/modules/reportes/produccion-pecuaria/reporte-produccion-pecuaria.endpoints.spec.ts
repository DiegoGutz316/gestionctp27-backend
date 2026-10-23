/* eslint-disable @typescript-eslint/no-unsafe-return -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - ReporteProduccionPecuariaController (módulo REPORTES)
 *
 *   GET /reportes/produccion-pecuaria?animalId&fechaInicio&fechaFin  LECTURA
 *   (ESTUDIANTE no tiene acceso a REPORTES en la matriz)
 */
import { probarEndpoints } from '../../../../test/helpers/tabla-endpoints';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { ReporteProduccionPecuariaController } from './reporte-produccion-pecuaria.controller';
import { ReporteProduccionPecuariaService } from './reporte-produccion-pecuaria.service';

const RUTA = '/reportes/produccion-pecuaria';
const Q = 'animalId=1&fechaInicio=2026-09-01&fechaFin=2026-09-30';

probarEndpoints({
  titulo: 'ReporteProduccionPecuariaController',
  controller: ReporteProduccionPecuariaController,
  servicioToken: ReporteProduccionPecuariaService,
  metodosServicio: ['generar'],
  casos: [
    {
      metodo: 'get',
      ruta: `${RUTA}?${Q}`,
      modulo: ModuloSistema.REPORTES,
      nivel: NivelPermiso.LECTURA,
      servicio: 'generar',
      respuesta: { registros: [], totales: [] },
      argumentos: () => [
        expect.objectContaining({
          animalId: 1,
          fechaInicio: '2026-09-01',
          fechaFin: '2026-09-30',
        }),
      ],
      invalidos: [
        [
          'sin animalId',
          { ruta: `${RUTA}?fechaInicio=2026-09-01&fechaFin=2026-09-30` },
        ],
        ['sin fechaInicio', { ruta: `${RUTA}?animalId=1&fechaFin=2026-09-30` }],
        ['sin fechaFin', { ruta: `${RUTA}?animalId=1&fechaInicio=2026-09-01` }],
        [
          'rango invertido',
          {
            ruta: `${RUTA}?animalId=1&fechaInicio=2026-09-30&fechaFin=2026-09-01`,
          },
        ],
        [
          'fecha futura',
          {
            ruta: `${RUTA}?animalId=1&fechaInicio=2026-09-01&fechaFin=2999-01-01`,
          },
        ],
        [
          'animalId no numérico',
          {
            ruta: `${RUTA}?animalId=x&fechaInicio=2026-09-01&fechaFin=2026-09-30`,
          },
        ],
      ],
    },
  ],
});
