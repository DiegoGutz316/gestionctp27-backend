/* eslint-disable @typescript-eslint/no-unsafe-return -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - ColegioController (módulo LIBRO_CAJA)
 *
 *   GET /libro-caja/colegio  LECTURA
 *   PUT /libro-caja/colegio  COMPLETO
 */
import { probarEndpoints } from '../../../../test/helpers/tabla-endpoints';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { ColegioController } from './colegio.controller';
import { ColegioService } from './colegio.service';

const M = ModuloSistema.LIBRO_CAJA;
const colegio = {
  nombre: 'CTP 27 de Abril',
  numeroCuentaBancaria: '100-01-000-123456-7',
  entidadDeposito: 'Banco Nacional',
};

probarEndpoints({
  titulo: 'ColegioController',
  controller: ColegioController,
  servicioToken: ColegioService,
  metodosServicio: ['obtener', 'actualizar'],
  casos: [
    {
      metodo: 'get',
      ruta: '/libro-caja/colegio',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'obtener',
      respuesta: colegio,
      argumentos: () => [],
    },
    {
      metodo: 'put',
      ruta: '/libro-caja/colegio',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'actualizar',
      cuerpo: { ...colegio, nombre: '  CTP 27 de Abril  ' },
      argumentos: (u) => [expect.objectContaining(colegio), u],
      invalidos: [
        ['nombre vacío', { cuerpo: { ...colegio, nombre: ' ' } }],
        ['cuenta vacía', { cuerpo: { ...colegio, numeroCuentaBancaria: '' } }],
        [
          'cuenta > 50',
          { cuerpo: { ...colegio, numeroCuentaBancaria: '1'.repeat(51) } },
        ],
        [
          'entidad de 1 carácter',
          { cuerpo: { ...colegio, entidadDeposito: 'B' } },
        ],
        [
          'entidad > 150',
          { cuerpo: { ...colegio, entidadDeposito: 'B'.repeat(151) } },
        ],
        ['propiedad no permitida', { cuerpo: { ...colegio, cedula: 1 } }],
      ],
    },
  ],
});
