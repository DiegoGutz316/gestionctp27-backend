/* eslint-disable @typescript-eslint/no-unsafe-return -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - AnimalController (módulo PECUARIA)
 *
 *   POST  /pecuaria/animales               COMPLETO
 *   GET   /pecuaria/animales               LECTURA
 *   GET   /pecuaria/animales/:id           LECTURA
 *   PATCH /pecuaria/animales/:id           COMPLETO
 *   PATCH /pecuaria/animales/:id/desactivar COMPLETO
 */
import { probarEndpoints } from '../../../../test/helpers/tabla-endpoints';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { AnimalController } from './animal.controller';
import { AnimalService } from './animal.service';

const M = ModuloSistema.PECUARIA;
const animal = {
  codigo: 'CHA-001',
  nombre: 'Luna',
  especie: 'CHANCHO',
  raza: 'Landrace',
  fechaNacimiento: '2025-01-10',
  estado: 'ACTIVO',
};

probarEndpoints({
  titulo: 'AnimalController',
  controller: AnimalController,
  servicioToken: AnimalService,
  metodosServicio: ['crear', 'listar', 'obtener', 'actualizar', 'desactivar'],
  casos: [
    {
      metodo: 'post',
      ruta: '/pecuaria/animales',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'crear',
      cuerpo: animal,
      argumentos: (u) => [expect.objectContaining(animal), u],
      invalidos: [
        ['código vacío', { cuerpo: { ...animal, codigo: '' } }],
        ['código > 50', { cuerpo: { ...animal, codigo: 'C'.repeat(51) } }],
        ['nombre vacío', { cuerpo: { ...animal, nombre: ' ' } }],
        ['especie inexistente', { cuerpo: { ...animal, especie: 'DRAGON' } }],
        ['estado inexistente', { cuerpo: { ...animal, estado: 'MUERTO' } }],
        [
          'fecha de nacimiento futura',
          { cuerpo: { ...animal, fechaNacimiento: '2999-01-01' } },
        ],
        [
          'fecha de nacimiento inexistente',
          { cuerpo: { ...animal, fechaNacimiento: '2026-02-30' } },
        ],
        [
          'categoría bovina inexistente',
          { cuerpo: { ...animal, categoriaBovina: 'DINOSAURIO' } },
        ],
        ['propiedad no permitida', { cuerpo: { ...animal, peso: 10 } }],
      ],
    },
    {
      metodo: 'get',
      ruta: '/pecuaria/animales?q=lu&incluirInactivos=true&orden=CODIGO',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'listar',
      respuesta: [{ id: 1 }],
      argumentos: () => [
        expect.objectContaining({
          q: 'lu',
          incluirInactivos: true,
          orden: 'CODIGO',
        }),
      ],
      invalidos: [
        ['orden inexistente', { ruta: '/pecuaria/animales?orden=PESO' }],
      ],
    },
    {
      metodo: 'get',
      ruta: '/pecuaria/animales/9',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'obtener',
      respuesta: { id: 9 },
      argumentos: () => [9],
      invalidos: [['id no numérico', { ruta: '/pecuaria/animales/abc' }]],
    },
    {
      metodo: 'patch',
      ruta: '/pecuaria/animales/9',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'actualizar',
      cuerpo: animal,
      argumentos: (u) => [9, expect.objectContaining(animal), u],
      invalidos: [
        ['id no numérico', { ruta: '/pecuaria/animales/x', cuerpo: animal }],
        ['sin raza', { cuerpo: { ...animal, raza: undefined } }],
        [
          'fecha de nacimiento futura',
          { cuerpo: { ...animal, fechaNacimiento: '2999-01-01' } },
        ],
      ],
    },
    {
      metodo: 'patch',
      ruta: '/pecuaria/animales/9/desactivar',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'desactivar',
      argumentos: (u) => [9, u],
      invalidos: [
        ['id no numérico', { ruta: '/pecuaria/animales/x/desactivar' }],
      ],
    },
  ],
});
