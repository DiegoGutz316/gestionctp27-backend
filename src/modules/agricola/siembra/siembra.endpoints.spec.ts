/* eslint-disable @typescript-eslint/no-unsafe-return -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - SiembraController (módulo AGRICOLA)
 *
 *   POST  /agricola/siembras               COMPLETO
 *   PATCH /agricola/siembras/:id/finalizar COMPLETO
 *   GET   /agricola/siembras               LECTURA
 *   GET   /agricola/siembras/:id           LECTURA (historial)
 */
import { probarEndpoints } from '../../../../test/helpers/tabla-endpoints';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { SiembraController } from './siembra.controller';
import { SiembraService } from './siembra.service';

const M = ModuloSistema.AGRICOLA;
const siembra = {
  camaId: 1,
  cultivoId: 1,
  fechaSiembra: '2026-09-15',
  cantidadSembrada: 25,
  unidadSembrada: 'UNIDADES',
};

probarEndpoints({
  titulo: 'SiembraController',
  controller: SiembraController,
  servicioToken: SiembraService,
  metodosServicio: ['registrar', 'finalizar', 'consultar', 'obtenerDetalle'],
  casos: [
    {
      metodo: 'post',
      ruta: '/agricola/siembras',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'registrar',
      cuerpo: siembra,
      argumentos: (u) => [expect.objectContaining(siembra), u],
      invalidos: [
        ['sin cama', { cuerpo: { ...siembra, camaId: undefined } }],
        ['cantidad 0', { cuerpo: { ...siembra, cantidadSembrada: 0 } }],
        ['cantidad negativa', { cuerpo: { ...siembra, cantidadSembrada: -3 } }],
        [
          'fecha futura',
          { cuerpo: { ...siembra, fechaSiembra: '2999-01-01' } },
        ],
        [
          'unidad inexistente',
          { cuerpo: { ...siembra, unidadSembrada: 'TON' } },
        ],
        ['propiedad no permitida', { cuerpo: { ...siembra, extra: 1 } }],
      ],
    },
    {
      metodo: 'patch',
      ruta: '/agricola/siembras/8/finalizar',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'finalizar',
      cuerpo: { motivo: 'PLAGA', detalle: 'Mosca blanca' },
      argumentos: (u) => [8, expect.objectContaining({ motivo: 'PLAGA' }), u],
      invalidos: [
        ['motivo inexistente', { cuerpo: { motivo: 'ABURRIMIENTO' } }],
        ['sin motivo', { cuerpo: {} }],
        [
          'detalle > 500',
          { cuerpo: { motivo: 'OTRO', detalle: 'x'.repeat(501) } },
        ],
        [
          'id no numérico',
          {
            ruta: '/agricola/siembras/x/finalizar',
            cuerpo: { motivo: 'OTRO' },
          },
        ],
      ],
    },
    {
      metodo: 'get',
      ruta: '/agricola/siembras?cultivo=Tomate&fecha=2026-09-15',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'consultar',
      respuesta: [{ id: 1 }],
      argumentos: () => [
        expect.objectContaining({ cultivo: 'Tomate', fecha: '2026-09-15' }),
      ],
      invalidos: [
        ['propiedad desconocida', { ruta: '/agricola/siembras?foo=1' }],
      ],
    },
    {
      metodo: 'get',
      ruta: '/agricola/siembras/8',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'obtenerDetalle',
      respuesta: { siembra: { id: 8 }, cuidados: [], cosechas: [] },
      argumentos: () => [8],
      invalidos: [['id no numérico', { ruta: '/agricola/siembras/abc' }]],
    },
  ],
});
