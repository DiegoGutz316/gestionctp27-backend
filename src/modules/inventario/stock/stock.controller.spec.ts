/* eslint-disable @typescript-eslint/no-unsafe-return -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - StockController (módulo INVENTARIO)
 *
 *   POST  /inventario/configuracion-stock         COMPLETO
 *   GET   /inventario/configuracion-stock/:id     LECTURA
 *   PATCH /inventario/configuracion-stock/:id     COMPLETO
 *   GET   /inventario/existencias                 LECTURA
 *   GET   /inventario/existencias/movimientos     LECTURA (antes de :id)
 *   GET   /inventario/existencias/:id             LECTURA
 *   POST  /inventario/existencias/:id/entradas    COMPLETO + Idempotency-Key
 *   POST  /inventario/existencias/:id/salidas     COMPLETO + Idempotency-Key
 */
import { probarEndpoints } from '../../../../test/helpers/tabla-endpoints';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

const M = ModuloSistema.INVENTARIO;
const CLAVE = '3F2504E0-4F89-41D3-9A0C-0305E82C3301';
const cabeceras = { 'idempotency-key': CLAVE };
const entrada = { cantidad: 10.5, fecha: '2026-09-10', origen: 'Compra' };
const salida = { cantidad: 2, fecha: '2026-09-10', motivo: 'Uso en siembra' };

probarEndpoints({
  titulo: 'StockController',
  controller: StockController,
  servicioToken: StockService,
  metodosServicio: [
    'crearConfiguracion',
    'obtenerConfiguracion',
    'actualizarConfiguracion',
    'listarExistencias',
    'listarMovimientos',
    'obtenerExistencia',
    'registrarEntrada',
    'registrarSalida',
  ],
  casos: [
    {
      metodo: 'post',
      ruta: '/inventario/configuracion-stock',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'crearConfiguracion',
      cuerpo: { productoId: 1, stockMinimo: 5, precio: 1500.5 },
      argumentos: (u) => [
        expect.objectContaining({
          productoId: 1,
          stockMinimo: 5,
          precio: 1500.5,
        }),
        u,
      ],
      invalidos: [
        ['sin producto', { cuerpo: { stockMinimo: 5, precio: 1 } }],
        [
          'stock mínimo negativo',
          { cuerpo: { productoId: 1, stockMinimo: -1, precio: 1 } },
        ],
        [
          'precio con 3 decimales',
          { cuerpo: { productoId: 1, stockMinimo: 1, precio: 1.234 } },
        ],
        [
          'precio sobre el máximo',
          { cuerpo: { productoId: 1, stockMinimo: 1, precio: 1e11 } },
        ],
        [
          'propiedad no permitida',
          { cuerpo: { productoId: 1, stockMinimo: 1, precio: 1, x: 1 } },
        ],
      ],
    },
    {
      metodo: 'get',
      ruta: '/inventario/configuracion-stock/3',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'obtenerConfiguracion',
      respuesta: { id: 3 },
      argumentos: (u) => [3, u],
      invalidos: [
        ['id no numérico', { ruta: '/inventario/configuracion-stock/x' }],
      ],
    },
    {
      metodo: 'patch',
      ruta: '/inventario/configuracion-stock/3',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'actualizarConfiguracion',
      cuerpo: { stockMinimo: 8, activo: false },
      argumentos: (u) => [
        3,
        expect.objectContaining({ stockMinimo: 8, activo: false }),
        u,
      ],
      invalidos: [
        [
          'id no numérico',
          {
            ruta: '/inventario/configuracion-stock/x',
            cuerpo: { activo: true },
          },
        ],
        ['activo no booleano', { cuerpo: { activo: 'si' } }],
        ['stock mínimo negativo', { cuerpo: { stockMinimo: -5 } }],
      ],
    },
    {
      metodo: 'get',
      ruta: '/inventario/existencias?productoId=2&departamento=PECUARIO&pagina=1&limite=20',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'listarExistencias',
      respuesta: { datos: [] },
      argumentos: (u) => [
        expect.objectContaining({
          productoId: 2,
          departamento: 'PECUARIO',
          limite: 20,
        }),
        u,
      ],
      invalidos: [
        [
          'departamento inexistente',
          { ruta: '/inventario/existencias?departamento=X' },
        ],
        [
          'productoId no numérico',
          { ruta: '/inventario/existencias?productoId=abc' },
        ],
      ],
    },
    {
      metodo: 'get',
      ruta: '/inventario/existencias/movimientos?inventarioId=4&tipo=ENTRADA&desde=2026-09-01&hasta=2026-09-30',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'listarMovimientos',
      respuesta: { datos: [] },
      argumentos: (u) => [
        expect.objectContaining({
          inventarioId: 4,
          tipo: 'ENTRADA',
          desde: '2026-09-01',
          hasta: '2026-09-30',
        }),
        u,
      ],
      invalidos: [
        [
          'tipo inexistente',
          { ruta: '/inventario/existencias/movimientos?tipo=X' },
        ],
        [
          'rango invertido',
          {
            ruta: '/inventario/existencias/movimientos?desde=2026-09-30&hasta=2026-09-01',
          },
        ],
        [
          'fecha futura',
          { ruta: '/inventario/existencias/movimientos?hasta=2999-01-01' },
        ],
      ],
    },
    {
      metodo: 'get',
      ruta: '/inventario/existencias/4',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'obtenerExistencia',
      respuesta: { id: 4 },
      argumentos: (u) => [4, u],
      invalidos: [['id no numérico', { ruta: '/inventario/existencias/x' }]],
    },
    {
      metodo: 'post',
      ruta: '/inventario/existencias/4/entradas',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'registrarEntrada',
      cuerpo: entrada,
      cabeceras,
      argumentos: (u) => [
        4,
        expect.objectContaining(entrada),
        u,
        CLAVE.toLowerCase(),
      ],
      invalidos: [
        ['sin Idempotency-Key', { cabeceras: {} }],
        [
          'Idempotency-Key que no es UUID',
          { cabeceras: { 'idempotency-key': 'abc' } },
        ],
        ['cantidad 0', { cuerpo: { ...entrada, cantidad: 0 } }],
        [
          'cantidad con 3 decimales',
          { cuerpo: { ...entrada, cantidad: 1.001 } },
        ],
        ['fecha futura', { cuerpo: { ...entrada, fecha: '2999-01-01' } }],
        ['fecha inexistente', { cuerpo: { ...entrada, fecha: '2026-02-30' } }],
        ['origen vacío', { cuerpo: { ...entrada, origen: '  ' } }],
        ['id no numérico', { ruta: '/inventario/existencias/x/entradas' }],
      ],
    },
    {
      metodo: 'post',
      ruta: '/inventario/existencias/4/salidas',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'registrarSalida',
      cuerpo: salida,
      cabeceras,
      argumentos: (u) => [
        4,
        expect.objectContaining(salida),
        u,
        CLAVE.toLowerCase(),
      ],
      invalidos: [
        ['sin Idempotency-Key', { cabeceras: {} }],
        [
          'Idempotency-Key que no es UUID',
          { cabeceras: { 'idempotency-key': '123' } },
        ],
        ['cantidad negativa', { cuerpo: { ...salida, cantidad: -1 } }],
        ['motivo vacío', { cuerpo: { ...salida, motivo: '' } }],
        ['fecha futura', { cuerpo: { ...salida, fecha: '2999-01-01' } }],
        ['id no numérico', { ruta: '/inventario/existencias/x/salidas' }],
      ],
    },
  ],
});
