/* eslint-disable @typescript-eslint/no-unsafe-return -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - PeriodoController (módulo LIBRO_CAJA)
 *
 *   GET   /libro-caja/periodos                          LECTURA
 *   POST  /libro-caja/periodos                          COMPLETO
 *   GET   /libro-caja/periodos/:id                      LECTURA
 *   PATCH /libro-caja/periodos/:id                      COMPLETO
 *   POST  /libro-caja/periodos/:id/cerrar               COMPLETO
 *   POST  /libro-caja/periodos/:id/fondos/:fondoId/solicitar COMPLETO
 *   PATCH /libro-caja/periodos/:id/fondos/:fondoId/informe   LECTURA (la política
 *         de negocio del servicio restringe quién puede guardar el pie)
 */
import { probarEndpoints } from '../../../../test/helpers/tabla-endpoints';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { PeriodoController } from './periodo.controller';
import { PeriodoService } from './periodo.service';

const M = ModuloSistema.LIBRO_CAJA;
const periodo = {
  nombre: 'II semestre 2026',
  fechaInicio: '2026-07-01',
  fechaFin: '2026-12-31',
};
const apertura = { ...periodo, fondos: [{ departamentoId: 1, monto: 1000.5 }] };
const pie = {
  observaciones: ['Sin novedad', '', ''],
  director: 'Director',
  presidente: 'Presidente',
  tesorera: 'Tesorera',
  firmaDirector: 'D',
  firmaPresidente: 'P',
  firmaTesorera: 'T',
  coordinador: 'Coordinador',
};

probarEndpoints({
  titulo: 'PeriodoController',
  controller: PeriodoController,
  servicioToken: PeriodoService,
  metodosServicio: [
    'listar',
    'abrir',
    'obtener',
    'actualizar',
    'cerrar',
    'solicitarFondo',
    'guardarPieInforme',
  ],
  casos: [
    {
      metodo: 'get',
      ruta: '/libro-caja/periodos?estado=ABIERTO&pagina=1&limite=10',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'listar',
      respuesta: { datos: [] },
      argumentos: () => [expect.objectContaining({ estado: 'ABIERTO' })],
      invalidos: [
        ['estado inexistente', { ruta: '/libro-caja/periodos?estado=X' }],
      ],
    },
    {
      metodo: 'post',
      ruta: '/libro-caja/periodos',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'abrir',
      cuerpo: apertura,
      argumentos: (u) => [expect.objectContaining(periodo), u],
      invalidos: [
        ['nombre vacío', { cuerpo: { ...apertura, nombre: ' ' } }],
        [
          'fecha inexistente',
          { cuerpo: { ...apertura, fechaInicio: '2026-02-30' } },
        ],
        [
          'rango invertido',
          {
            cuerpo: {
              ...apertura,
              fechaInicio: '2026-12-31',
              fechaFin: '2026-07-01',
            },
          },
        ],
        ['sin fondos', { cuerpo: { ...apertura, fondos: [] } }],
        [
          'fondo con monto negativo',
          {
            cuerpo: { ...apertura, fondos: [{ departamentoId: 1, monto: -5 }] },
          },
        ],
        [
          'fondo con 3 decimales',
          {
            cuerpo: {
              ...apertura,
              fondos: [{ departamentoId: 1, monto: 1.234 }],
            },
          },
        ],
        [
          'fondo sin departamento',
          { cuerpo: { ...apertura, fondos: [{ monto: 10 }] } },
        ],
      ],
    },
    {
      metodo: 'get',
      ruta: '/libro-caja/periodos/5',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'obtener',
      respuesta: { id: 5 },
      argumentos: () => [5],
      invalidos: [['id no numérico', { ruta: '/libro-caja/periodos/x' }]],
    },
    {
      metodo: 'patch',
      ruta: '/libro-caja/periodos/5',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'actualizar',
      cuerpo: periodo,
      argumentos: (u) => [5, expect.objectContaining(periodo), u],
      invalidos: [
        ['id no numérico', { ruta: '/libro-caja/periodos/x', cuerpo: periodo }],
        [
          'rango invertido',
          { cuerpo: { ...periodo, fechaInicio: '2027-01-01' } },
        ],
        ['fondos no permitidos al editar', { cuerpo: apertura }],
      ],
    },
    {
      metodo: 'post',
      ruta: '/libro-caja/periodos/5/cerrar',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'cerrar',
      argumentos: (u) => [5, u],
      invalidos: [
        ['id no numérico', { ruta: '/libro-caja/periodos/x/cerrar' }],
      ],
    },
    {
      metodo: 'post',
      ruta: '/libro-caja/periodos/5/fondos/7/solicitar',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'solicitarFondo',
      cuerpo: { montoSolicitado: 50000 },
      argumentos: (u) => [
        5,
        7,
        expect.objectContaining({ montoSolicitado: 50000 }),
        u,
      ],
      invalidos: [
        ['monto negativo', { cuerpo: { montoSolicitado: -1 } }],
        ['monto con 3 decimales', { cuerpo: { montoSolicitado: 1.001 } }],
        ['sin monto', { cuerpo: {} }],
        [
          'fondoId no numérico',
          {
            ruta: '/libro-caja/periodos/5/fondos/x/solicitar',
            cuerpo: { montoSolicitado: 1 },
          },
        ],
      ],
    },
    {
      metodo: 'patch',
      ruta: '/libro-caja/periodos/5/fondos/7/informe',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'guardarPieInforme',
      cuerpo: pie,
      argumentos: (u) => [
        5,
        7,
        expect.objectContaining({ director: 'Director' }),
        u,
      ],
      invalidos: [
        [
          'observaciones con 2 elementos',
          { cuerpo: { ...pie, observaciones: ['a', 'b'] } },
        ],
        [
          'observación > 300',
          { cuerpo: { ...pie, observaciones: ['x'.repeat(301), '', ''] } },
        ],
        [
          'observaciones no es arreglo',
          { cuerpo: { ...pie, observaciones: 'texto' } },
        ],
        [
          'id no numérico',
          { ruta: '/libro-caja/periodos/x/fondos/7/informe', cuerpo: pie },
        ],
      ],
    },
  ],
});
