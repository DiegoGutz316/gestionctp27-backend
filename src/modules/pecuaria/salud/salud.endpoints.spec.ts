/* eslint-disable @typescript-eslint/no-unsafe-return -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - SaludController (módulo PECUARIA)
 *
 *   POST /pecuaria/salud  COMPLETO
 *   GET  /pecuaria/salud?animalId=  LECTURA (animalId obligatorio)
 */
import { probarEndpoints } from '../../../../test/helpers/tabla-endpoints';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { SaludController } from './salud.controller';
import { SaludService } from './salud.service';

const M = ModuloSistema.PECUARIA;
const salud = {
  animalId: 1,
  fecha: '2026-09-10',
  condicionObservada: 'ENFERMO',
  diagnostico: '  Mastitis  ',
};

probarEndpoints({
  titulo: 'SaludController',
  controller: SaludController,
  servicioToken: SaludService,
  metodosServicio: ['registrar', 'consultar'],
  casos: [
    {
      metodo: 'post',
      ruta: '/pecuaria/salud',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'registrar',
      cuerpo: salud,
      argumentos: (u) => [
        expect.objectContaining({ diagnostico: 'Mastitis' }),
        u,
      ],
      invalidos: [
        [
          'condición inexistente',
          { cuerpo: { ...salud, condicionObservada: 'ZOMBI' } },
        ],
        ['sin animal', { cuerpo: { ...salud, animalId: undefined } }],
        ['fecha inexistente', { cuerpo: { ...salud, fecha: '2026-02-30' } }],
        [
          'diagnóstico > 500',
          { cuerpo: { ...salud, diagnostico: 'd'.repeat(501) } },
        ],
        [
          'observaciones > 1000',
          { cuerpo: { ...salud, observaciones: 'o'.repeat(1001) } },
        ],
      ],
    },
    {
      metodo: 'get',
      ruta: '/pecuaria/salud?animalId=1',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'consultar',
      respuesta: [{ id: 1 }],
      argumentos: () => [expect.objectContaining({ animalId: 1 })],
      invalidos: [
        ['sin animalId', { ruta: '/pecuaria/salud' }],
        ['animalId no numérico', { ruta: '/pecuaria/salud?animalId=abc' }],
        ['animalId 0', { ruta: '/pecuaria/salud?animalId=0' }],
      ],
    },
  ],
});
