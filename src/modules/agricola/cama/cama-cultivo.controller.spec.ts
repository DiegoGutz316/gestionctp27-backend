/* eslint-disable @typescript-eslint/no-unsafe-return -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - CamaCultivoController (módulo AGRICOLA)
 *
 *   POST   /agricola/camas        COMPLETO
 *   GET    /agricola/camas        LECTURA
 *   GET    /agricola/camas/:id    LECTURA
 *   PATCH  /agricola/camas/:id    COMPLETO
 *   DELETE /agricola/camas/:id    COMPLETO (204)
 */
import { probarEndpoints } from '../../../../test/helpers/tabla-endpoints';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { CamaCultivoController } from './cama-cultivo.controller';
import { CamaCultivoService } from './cama-cultivo.service';

const M = ModuloSistema.AGRICOLA;

probarEndpoints({
  titulo: 'CamaCultivoController',
  controller: CamaCultivoController,
  servicioToken: CamaCultivoService,
  metodosServicio: ['crear', 'listar', 'obtener', 'eliminar', 'actualizar'],
  casos: [
    {
      metodo: 'post',
      ruta: '/agricola/camas',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'crear',
      cuerpo: {
        codigo: 'CAMA-001',
        ubicacion: 'Invernadero 1',
      },
      argumentos: (u) => [expect.objectContaining({ codigo: 'CAMA-001' }), u],
      invalidos: [
        ['código vacío', { cuerpo: { codigo: '  ', ubicacion: 'I1' } }],
        [
          'código > 50 caracteres',
          {
            cuerpo: {
              codigo: 'C'.repeat(51),
              ubicacion: 'I1',
            },
          },
        ],
        ['ubicación vacía', { cuerpo: { codigo: 'C1', ubicacion: '' } }],
        [
          'estado (el estado inicial lo fija el sistema, no se acepta al crear)',
          { cuerpo: { codigo: 'C1', ubicacion: 'I1', estado: 'DISPONIBLE' } },
        ],
        [
          'propiedad no permitida',
          {
            cuerpo: {
              codigo: 'C1',
              ubicacion: 'I1',
              x: 1,
            },
          },
        ],
      ],
    },
    {
      metodo: 'get',
      ruta: '/agricola/camas?q=CAMA&ubicacion=Invernadero%201&camaId=3',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'listar',
      respuesta: [{ id: 3 }],
      argumentos: () => [
        expect.objectContaining({
          q: 'CAMA',
          ubicacion: 'Invernadero 1',
          camaId: 3,
        }),
      ],
      invalidos: [
        ['camaId no numérico', { ruta: '/agricola/camas?camaId=abc' }],
      ],
    },
    {
      metodo: 'get',
      ruta: '/agricola/camas/5',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'obtener',
      respuesta: { id: 5 },
      argumentos: () => [5],
      invalidos: [['id no numérico', { ruta: '/agricola/camas/abc' }]],
    },
    {
      metodo: 'patch',
      ruta: '/agricola/camas/5',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'actualizar',
      cuerpo: { codigo: 'CAMA-002', ubicacion: 'Invernadero 2' },
      argumentos: (u) => [
        5,
        expect.objectContaining({ codigo: 'CAMA-002' }),
        u,
      ],
      invalidos: [
        [
          'id no numérico',
          {
            ruta: '/agricola/camas/x',
            cuerpo: { codigo: 'C', ubicacion: 'U' },
          },
        ],
        ['sin ubicación', { cuerpo: { codigo: 'C' } }],
        [
          'estado inexistente',
          { cuerpo: { codigo: 'C', ubicacion: 'U', estado: 'NADA' } },
        ],
      ],
    },
    {
      metodo: 'delete',
      ruta: '/agricola/camas/5',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'eliminar',
      estado: 204,
      argumentos: () => [5],
      invalidos: [['id no numérico', { ruta: '/agricola/camas/x' }]],
    },
  ],
});
