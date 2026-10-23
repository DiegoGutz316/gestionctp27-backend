/* eslint-disable @typescript-eslint/no-unsafe-return -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - DesparasitacionController (módulo PECUARIA)
 *
 *   POST /pecuaria/desparasitaciones                    COMPLETO
 *   GET  /pecuaria/animales/:animalId/desparasitaciones LECTURA
 */
import { probarEndpoints } from '../../../test/helpers/tabla-endpoints';
import { ModuloSistema } from '../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../auth/enums/nivel-permiso.enum';
import { DesparasitacionController } from './desparasitacion.controller';
import { DesparasitacionService } from './desparasitacion.service';

const M = ModuloSistema.PECUARIA;
const desp = { animalId: 1, producto: 'Ivermectina', fecha: '2026-09-10' };

probarEndpoints({
  titulo: 'DesparasitacionController',
  controller: DesparasitacionController,
  servicioToken: DesparasitacionService,
  metodosServicio: ['crear', 'listarPorAnimal'],
  casos: [
    {
      metodo: 'post',
      ruta: '/pecuaria/desparasitaciones',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'crear',
      cuerpo: { ...desp, observaciones: 'Rutina' },
      argumentos: (u) => [expect.objectContaining(desp), u],
      invalidos: [
        ['sin animal', { cuerpo: { ...desp, animalId: undefined } }],
        ['producto vacío', { cuerpo: { ...desp, producto: ' ' } }],
        ['producto > 120', { cuerpo: { ...desp, producto: 'p'.repeat(121) } }],
        ['fecha futura', { cuerpo: { ...desp, fecha: '2999-01-01' } }],
        [
          'observaciones > 500',
          { cuerpo: { ...desp, observaciones: 'o'.repeat(501) } },
        ],
        ['propiedad no permitida', { cuerpo: { ...desp, dosis: '1' } }],
      ],
    },
    {
      metodo: 'get',
      ruta: '/pecuaria/animales/4/desparasitaciones',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'listarPorAnimal',
      respuesta: [{ id: 1 }],
      argumentos: () => [4],
      invalidos: [
        [
          'animalId no numérico',
          { ruta: '/pecuaria/animales/x/desparasitaciones' },
        ],
      ],
    },
  ],
});
