/* eslint-disable @typescript-eslint/no-unsafe-return -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - DepartamentoController (módulo LIBRO_CAJA)
 *
 *   GET   /libro-caja/departamentos                LECTURA
 *   POST  /libro-caja/departamentos                COMPLETO
 *   GET   /libro-caja/departamentos/:id            LECTURA
 *   PATCH /libro-caja/departamentos/:id/desactivar COMPLETO
 *   PATCH /libro-caja/departamentos/:id            COMPLETO
 */
import { probarEndpoints } from '../../../../test/helpers/tabla-endpoints';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { DepartamentoController } from './departamento.controller';
import { DepartamentoService } from './departamento.service';

const M = ModuloSistema.LIBRO_CAJA;
const depto = { nombreUnidad: 'Agrícola', tipoActividad: 'Producción' };

probarEndpoints({
  titulo: 'DepartamentoController',
  controller: DepartamentoController,
  servicioToken: DepartamentoService,
  metodosServicio: ['listar', 'crear', 'obtener', 'desactivar', 'actualizar'],
  casos: [
    {
      metodo: 'get',
      ruta: '/libro-caja/departamentos?tipoActividad=Producción&activo=true&pagina=1&limite=10',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'listar',
      respuesta: { datos: [] },
      argumentos: () => [
        expect.objectContaining({
          tipoActividad: 'Producción',
          activo: true,
          limite: 10,
        }),
      ],
      invalidos: [
        [
          'activo no booleano',
          { ruta: '/libro-caja/departamentos?activo=quizas' },
        ],
        [
          'tipoActividad > 120',
          {
            ruta: `/libro-caja/departamentos?tipoActividad=${'t'.repeat(121)}`,
          },
        ],
        ['página 0', { ruta: '/libro-caja/departamentos?pagina=0' }],
      ],
    },
    {
      metodo: 'post',
      ruta: '/libro-caja/departamentos',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'crear',
      cuerpo: depto,
      argumentos: (u) => [expect.objectContaining(depto), u],
      invalidos: [
        [
          'nombre de unidad vacío',
          { cuerpo: { ...depto, nombreUnidad: '  ' } },
        ],
        [
          'nombre > 120',
          { cuerpo: { ...depto, nombreUnidad: 'n'.repeat(121) } },
        ],
        [
          'tipo de actividad vacío',
          { cuerpo: { ...depto, tipoActividad: '' } },
        ],
        ['propiedad no permitida', { cuerpo: { ...depto, activo: true } }],
      ],
    },
    {
      metodo: 'get',
      ruta: '/libro-caja/departamentos/2',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'obtener',
      respuesta: { id: 2 },
      argumentos: () => [2],
      invalidos: [['id no numérico', { ruta: '/libro-caja/departamentos/x' }]],
    },
    {
      metodo: 'patch',
      ruta: '/libro-caja/departamentos/2/desactivar',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'desactivar',
      argumentos: (u) => [2, u],
      invalidos: [
        ['id no numérico', { ruta: '/libro-caja/departamentos/x/desactivar' }],
      ],
    },
    {
      metodo: 'patch',
      ruta: '/libro-caja/departamentos/2',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'actualizar',
      cuerpo: depto,
      argumentos: (u) => [2, expect.objectContaining(depto), u],
      invalidos: [
        [
          'id no numérico',
          { ruta: '/libro-caja/departamentos/x', cuerpo: depto },
        ],
        ['sin tipo de actividad', { cuerpo: { nombreUnidad: 'A' } }],
      ],
    },
  ],
});
