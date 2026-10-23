/* eslint-disable @typescript-eslint/no-unsafe-return -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - CultivoController (módulo AGRICOLA)
 *
 *   POST   /agricola/cultivos      COMPLETO
 *   GET    /agricola/cultivos      LECTURA
 *   GET    /agricola/cultivos/:id  LECTURA (aplica mapearCultivo: oculta nombreNormalizado)
 *   PATCH  /agricola/cultivos/:id  COMPLETO
 *   DELETE /agricola/cultivos/:id  COMPLETO (204)
 */
import { probarEndpoints } from '../../../../test/helpers/tabla-endpoints';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { CultivoController } from './cultivo.controller';
import { CultivoService } from './cultivo.service';

const M = ModuloSistema.AGRICOLA;
const entidad = {
  id: 4,
  nombre: 'Tomate',
  nombreNormalizado: 'tomate',
  tipo: 'HORTALIZA',
  descripcion: null,
  activo: true,
  creadoEn: '2026-09-01T00:00:00.000Z',
  creadoPor: 'u1',
};

probarEndpoints({
  titulo: 'CultivoController',
  controller: CultivoController,
  servicioToken: CultivoService,
  metodosServicio: ['registrar', 'obtener', 'editar', 'eliminar', 'consultar'],
  casos: [
    {
      metodo: 'post',
      ruta: '/agricola/cultivos',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'registrar',
      cuerpo: { nombre: '  Tomate   cherry ', tipo: 'HORTALIZA' },
      argumentos: (u) => [
        expect.objectContaining({ nombre: 'Tomate cherry' }),
        u,
      ],
      invalidos: [
        ['nombre vacío', { cuerpo: { nombre: '', tipo: 'HORTALIZA' } }],
        [
          'nombre > 120',
          { cuerpo: { nombre: 'x'.repeat(121), tipo: 'HORTALIZA' } },
        ],
        ['tipo inexistente', { cuerpo: { nombre: 'Tomate', tipo: 'MINERAL' } }],
        [
          'descripción > 500',
          {
            cuerpo: {
              nombre: 'T',
              tipo: 'FRUTA',
              descripcion: 'x'.repeat(501),
            },
          },
        ],
        [
          'activo no booleano',
          { cuerpo: { nombre: 'T', tipo: 'FRUTA', activo: 'si' } },
        ],
      ],
    },
    {
      metodo: 'get',
      ruta: '/agricola/cultivos/4',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'obtener',
      respuesta: entidad,
      cuerpoEsperado: {
        id: 4,
        nombre: 'Tomate',
        tipo: 'HORTALIZA',
        descripcion: null,
        activo: true,
        creadoEn: '2026-09-01T00:00:00.000Z',
        creadoPor: 'u1',
      },
      argumentos: () => [4],
      invalidos: [['id no numérico', { ruta: '/agricola/cultivos/abc' }]],
    },
    {
      metodo: 'get',
      ruta: '/agricola/cultivos?soloActivos=true&tipo=FRUTA&q=man',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'consultar',
      respuesta: [{ id: 1 }],
      argumentos: () => [
        expect.objectContaining({ soloActivos: true, tipo: 'FRUTA', q: 'man' }),
      ],
      invalidos: [
        ['tipo inexistente', { ruta: '/agricola/cultivos?tipo=X' }],
        [
          'soloActivos no booleano',
          { ruta: '/agricola/cultivos?soloActivos=quizas' },
        ],
      ],
    },
    {
      metodo: 'patch',
      ruta: '/agricola/cultivos/4',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'editar',
      cuerpo: { activo: false },
      argumentos: () => [4, expect.objectContaining({ activo: false })],
      invalidos: [
        [
          'id no numérico',
          { ruta: '/agricola/cultivos/x', cuerpo: { activo: false } },
        ],
        ['tipo inexistente', { cuerpo: { tipo: 'Z' } }],
        ['propiedad no permitida', { cuerpo: { id: 9 } }],
      ],
    },
    {
      metodo: 'delete',
      ruta: '/agricola/cultivos/4',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'eliminar',
      estado: 204,
      argumentos: () => [4],
      invalidos: [['id no numérico', { ruta: '/agricola/cultivos/x' }]],
    },
  ],
});
