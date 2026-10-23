/* eslint-disable @typescript-eslint/no-unsafe-return -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - ProduccionController (módulo PECUARIA)
 *
 *   POST /pecuaria/produccion  COMPLETO
 *   GET  /pecuaria/produccion?animalId=  LECTURA
 */
import { probarEndpoints } from '../../../../test/helpers/tabla-endpoints';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { ProduccionController } from './produccion.controller';
import { ProduccionService } from './produccion.service';

const M = ModuloSistema.PECUARIA;
const prod = {
  animalId: 1,
  tipoProduccion: 'LECHE',
  cantidad: 12.5,
  fecha: '2026-09-10',
};

probarEndpoints({
  titulo: 'ProduccionController',
  controller: ProduccionController,
  servicioToken: ProduccionService,
  metodosServicio: ['registrar', 'consultar'],
  casos: [
    {
      metodo: 'post',
      ruta: '/pecuaria/produccion',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'registrar',
      cuerpo: prod,
      argumentos: (u) => [expect.objectContaining(prod), u],
      invalidos: [
        ['cantidad 0', { cuerpo: { ...prod, cantidad: 0 } }],
        ['cantidad negativa', { cuerpo: { ...prod, cantidad: -2 } }],
        ['más de 2 decimales', { cuerpo: { ...prod, cantidad: 1.234 } }],
        ['tipo inexistente', { cuerpo: { ...prod, tipoProduccion: 'LANA' } }],
        ['fecha futura', { cuerpo: { ...prod, fecha: '2999-01-01' } }],
        ['sin animal', { cuerpo: { ...prod, animalId: undefined } }],
        ['propiedad no permitida', { cuerpo: { ...prod, precio: 1 } }],
      ],
    },
    {
      metodo: 'get',
      ruta: '/pecuaria/produccion?animalId=1&desde=2026-09-01&tipoProduccion=LECHE',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'consultar',
      respuesta: [{ id: 1 }],
      argumentos: () => [
        expect.objectContaining({
          animalId: 1,
          desde: '2026-09-01',
          tipoProduccion: 'LECHE',
        }),
      ],
      invalidos: [
        ['sin animalId', { ruta: '/pecuaria/produccion' }],
        [
          'tipo inexistente',
          { ruta: '/pecuaria/produccion?animalId=1&tipoProduccion=X' },
        ],
        [
          'desde inválido',
          { ruta: '/pecuaria/produccion?animalId=1&desde=ayer' },
        ],
      ],
    },
  ],
});
