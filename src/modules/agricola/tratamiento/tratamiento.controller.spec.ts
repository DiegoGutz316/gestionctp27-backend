/* eslint-disable @typescript-eslint/no-unsafe-return -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - TratamientoController (módulo AGRICOLA)
 *
 *   POST /agricola/tratamientos  COMPLETO (riego, limpieza, fertilización, tratamiento)
 *   GET  /agricola/tratamientos  LECTURA
 */
import { probarEndpoints } from '../../../../test/helpers/tabla-endpoints';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { TratamientoController } from './tratamiento.controller';
import { TratamientoService } from './tratamiento.service';

const M = ModuloSistema.AGRICOLA;
const riego = { siembraId: 1, fecha: '2026-09-17', actividad: 'RIEGO' };

probarEndpoints({
  titulo: 'TratamientoController',
  controller: TratamientoController,
  servicioToken: TratamientoService,
  metodosServicio: ['registrar', 'consultar'],
  casos: [
    {
      metodo: 'post',
      ruta: '/agricola/tratamientos',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'registrar',
      cuerpo: riego,
      argumentos: (u) => [expect.objectContaining(riego), u],
      invalidos: [
        ['actividad inexistente', { cuerpo: { ...riego, actividad: 'BAILE' } }],
        ['fecha futura', { cuerpo: { ...riego, fecha: '2999-01-01' } }],
        ['sin siembra', { cuerpo: { fecha: riego.fecha, actividad: 'RIEGO' } }],
        [
          'tratamiento sin producto',
          { cuerpo: { ...riego, actividad: 'TRATAMIENTO' } },
        ],
        ['propiedad no permitida', { cuerpo: { ...riego, extra: 1 } }],
      ],
    },
    {
      metodo: 'post',
      ruta: '/agricola/tratamientos',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'registrar',
      cuerpo: {
        siembraId: 1,
        fecha: '2026-09-17',
        actividad: 'TRATAMIENTO',
        tipo: 'FUNGICIDA',
        producto: 'Caldo bordelés',
        cantidad: 2.5,
        unidad: 'L',
      },
      argumentos: (u) => [expect.objectContaining({ tipo: 'FUNGICIDA' }), u],
    },
    {
      metodo: 'get',
      ruta: '/agricola/tratamientos?cultivo=Tomate&camaId=2&tipo=FUNGICIDA',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'consultar',
      respuesta: [{ id: 1 }],
      argumentos: () => [
        expect.objectContaining({
          cultivo: 'Tomate',
          camaId: 2,
          tipo: 'FUNGICIDA',
        }),
      ],
      invalidos: [
        ['tipo inexistente', { ruta: '/agricola/tratamientos?tipo=X' }],
        ['camaId no numérico', { ruta: '/agricola/tratamientos?camaId=abc' }],
      ],
    },
  ],
});
