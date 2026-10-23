/* eslint-disable @typescript-eslint/no-unsafe-return -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - VacunaController (módulo PECUARIA)
 *
 *   POST /pecuaria/vacunas                 COMPLETO
 *   GET  /pecuaria/vacunas/animal/:animalId LECTURA
 */
import { probarEndpoints } from '../../../test/helpers/tabla-endpoints';
import { ModuloSistema } from '../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../auth/enums/nivel-permiso.enum';
import { VacunaController } from './vacuna.controller';
import { VacunaService } from './vacuna.service';

const M = ModuloSistema.PECUARIA;
const vacuna = {
  animalId: 1,
  tipoVacuna: 'Aftosa',
  fecha: '2026-09-10',
  dosis: '5 ml',
};

probarEndpoints({
  titulo: 'VacunaController',
  controller: VacunaController,
  servicioToken: VacunaService,
  metodosServicio: ['crear', 'listarPorAnimal'],
  casos: [
    {
      metodo: 'post',
      ruta: '/pecuaria/vacunas',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'crear',
      cuerpo: { ...vacuna, observaciones: 'Sin reacción' },
      argumentos: (u) => [expect.objectContaining(vacuna), u],
      invalidos: [
        ['sin animal', { cuerpo: { ...vacuna, animalId: undefined } }],
        ['tipo de vacuna vacío', { cuerpo: { ...vacuna, tipoVacuna: '  ' } }],
        ['dosis vacía', { cuerpo: { ...vacuna, dosis: '' } }],
        ['dosis > 50', { cuerpo: { ...vacuna, dosis: 'd'.repeat(51) } }],
        ['fecha futura', { cuerpo: { ...vacuna, fecha: '2999-01-01' } }],
        ['propiedad no permitida', { cuerpo: { ...vacuna, lote: 'x' } }],
      ],
    },
    {
      metodo: 'get',
      ruta: '/pecuaria/vacunas/animal/4',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'listarPorAnimal',
      respuesta: [{ id: 1 }],
      argumentos: () => [4],
      invalidos: [
        ['animalId no numérico', { ruta: '/pecuaria/vacunas/animal/x' }],
      ],
    },
  ],
});
