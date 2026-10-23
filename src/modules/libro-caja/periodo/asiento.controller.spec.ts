/* eslint-disable @typescript-eslint/no-unsafe-return -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - AsientoController (módulo LIBRO_CAJA)
 *
 *   GET    /libro-caja/periodos/:periodoId/fondos/:fondoId/asientos              LECTURA
 *   POST   /libro-caja/periodos/:periodoId/fondos/:fondoId/asientos              COMPLETO + Idempotency-Key
 *   PATCH  /libro-caja/periodos/:periodoId/fondos/:fondoId/asientos/:asientoId    COMPLETO
 *   DELETE /libro-caja/periodos/:periodoId/fondos/:fondoId/asientos/:asientoId    COMPLETO
 */
import { probarEndpoints } from '../../../../test/helpers/tabla-endpoints';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { AsientoController } from './asiento.controller';
import { AsientoService } from './asiento.service';

const M = ModuloSistema.LIBRO_CAJA;
const BASE = '/libro-caja/periodos/2/fondos/3/asientos';
const CLAVE = '3F2504E0-4F89-41D3-9A0C-0305E82C3301';
const asiento = {
  fecha: '2026-09-10',
  numeroFactura: 'F-100',
  descripcion: 'Venta de huevos',
  ingresos: 100,
  egresos: 0,
};

probarEndpoints({
  titulo: 'AsientoController',
  controller: AsientoController,
  servicioToken: AsientoService,
  metodosServicio: ['listar', 'crear', 'actualizar', 'eliminar'],
  casos: [
    {
      metodo: 'get',
      ruta: BASE,
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'listar',
      respuesta: [{ id: 1 }],
      argumentos: () => [2, 3],
      invalidos: [
        [
          'periodoId no numérico',
          { ruta: '/libro-caja/periodos/x/fondos/3/asientos' },
        ],
        [
          'fondoId no numérico',
          { ruta: '/libro-caja/periodos/2/fondos/x/asientos' },
        ],
      ],
    },
    {
      metodo: 'post',
      ruta: BASE,
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'crear',
      cuerpo: asiento,
      cabeceras: { 'idempotency-key': CLAVE },
      argumentos: (u) => [
        2,
        3,
        expect.objectContaining(asiento),
        u,
        CLAVE.toLowerCase(),
      ],
      invalidos: [
        ['sin Idempotency-Key', { cabeceras: {} }],
        [
          'Idempotency-Key inválida',
          { cabeceras: { 'idempotency-key': 'nope' } },
        ],
        ['ingreso y egreso a la vez', { cuerpo: { ...asiento, egresos: 5 } }],
        ['ingreso negativo', { cuerpo: { ...asiento, ingresos: -1 } }],
        ['monto con 3 decimales', { cuerpo: { ...asiento, ingresos: 1.234 } }],
        ['descripción vacía', { cuerpo: { ...asiento, descripcion: ' ' } }],
        [
          'descripción > 250',
          { cuerpo: { ...asiento, descripcion: 'd'.repeat(251) } },
        ],
        [
          'factura > 40',
          { cuerpo: { ...asiento, numeroFactura: 'f'.repeat(41) } },
        ],
        ['fecha inexistente', { cuerpo: { ...asiento, fecha: '2026-02-30' } }],
        ['propiedad no permitida', { cuerpo: { ...asiento, saldo: 1 } }],
      ],
    },
    {
      metodo: 'patch',
      ruta: `${BASE}/9`,
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'actualizar',
      cuerpo: { ...asiento, ingresos: 0, egresos: 40 },
      argumentos: (u) => [
        2,
        3,
        9,
        expect.objectContaining({ ingresos: 0, egresos: 40 }),
        u,
      ],
      invalidos: [
        ['asientoId no numérico', { ruta: `${BASE}/x`, cuerpo: asiento }],
        ['ingreso y egreso a la vez', { cuerpo: { ...asiento, egresos: 5 } }],
      ],
    },
    {
      metodo: 'delete',
      ruta: `${BASE}/9`,
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'eliminar',
      argumentos: (u) => [2, 3, 9, u],
      invalidos: [['asientoId no numérico', { ruta: `${BASE}/x` }]],
    },
  ],
});
