/* eslint-disable @typescript-eslint/no-unsafe-return -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - ReporteInventarioController (módulo REPORTES)
 *
 *   GET /reportes/inventario?fechaInicio&fechaFin[&productoId&tipoProducto]  LECTURA
 */
import { probarEndpoints } from '../../../../test/helpers/tabla-endpoints';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { ReporteInventarioController } from './reporte-inventario.controller';
import { ReporteInventarioService } from './reporte-inventario.service';

const RUTA = '/reportes/inventario';

probarEndpoints({
  titulo: 'ReporteInventarioController',
  controller: ReporteInventarioController,
  servicioToken: ReporteInventarioService,
  metodosServicio: ['generar'],
  casos: [
    {
      metodo: 'get',
      ruta: `${RUTA}?productoId=4&tipoProducto=INSUMO&fechaInicio=2026-09-01&fechaFin=2026-09-30`,
      modulo: ModuloSistema.REPORTES,
      nivel: NivelPermiso.LECTURA,
      servicio: 'generar',
      respuesta: {
        fechaInicio: '2026-09-01',
        fechaFin: '2026-09-30',
        registros: [],
      },
      argumentos: () => [
        expect.objectContaining({
          productoId: 4,
          tipoProducto: 'INSUMO',
          fechaInicio: '2026-09-01',
        }),
      ],
      invalidos: [
        ['sin fechas', { ruta: RUTA }],
        [
          'rango invertido',
          { ruta: `${RUTA}?fechaInicio=2026-09-30&fechaFin=2026-09-01` },
        ],
        [
          'tipo de producto inexistente',
          {
            ruta: `${RUTA}?tipoProducto=X&fechaInicio=2026-09-01&fechaFin=2026-09-30`,
          },
        ],
        [
          'productoId 0',
          {
            ruta: `${RUTA}?productoId=0&fechaInicio=2026-09-01&fechaFin=2026-09-30`,
          },
        ],
        [
          'fecha futura',
          { ruta: `${RUTA}?fechaInicio=2026-09-01&fechaFin=2999-01-01` },
        ],
      ],
    },
  ],
});
