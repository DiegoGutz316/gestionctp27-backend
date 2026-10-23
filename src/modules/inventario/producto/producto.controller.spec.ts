/* eslint-disable @typescript-eslint/no-unsafe-return -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - ProductoController (módulo INVENTARIO)
 *
 *   GET   /inventario/productos      LECTURA
 *   POST  /inventario/productos      COMPLETO
 *   GET   /inventario/productos/:id  LECTURA
 *   PATCH /inventario/productos/:id  COMPLETO
 */
import { probarEndpoints } from '../../../../test/helpers/tabla-endpoints';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { ProductoController } from './producto.controller';
import { ProductoService } from './producto.service';

const M = ModuloSistema.INVENTARIO;
const producto = {
  nombre: 'Fertilizante 10-30-10',
  tipoProducto: 'INSUMO',
  unidadMedida: 'UNIDAD',
  departamento: 'AGRICOLA',
  ubicacion: 'BODEGA_AGRICOLA',
};

probarEndpoints({
  titulo: 'ProductoController',
  controller: ProductoController,
  servicioToken: ProductoService,
  metodosServicio: ['listar', 'crear', 'obtener', 'actualizar'],
  casos: [
    {
      metodo: 'get',
      ruta: '/inventario/productos?nombre=fert&tipoProducto=INSUMO&departamento=AGRICOLA&ubicacion=TALLER&orden=CATEGORIA&pagina=2&limite=5',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'listar',
      respuesta: { datos: [], total: 0 },
      argumentos: (u) => [
        expect.objectContaining({
          nombre: 'fert',
          tipoProducto: 'INSUMO',
          departamento: 'AGRICOLA',
          ubicacion: 'TALLER',
          orden: 'CATEGORIA',
          pagina: 2,
          limite: 5,
        }),
        u,
      ],
      invalidos: [
        ['tipo inexistente', { ruta: '/inventario/productos?tipoProducto=X' }],
        [
          'departamento inexistente',
          { ruta: '/inventario/productos?departamento=X' },
        ],
        [
          'ubicación inexistente',
          { ruta: '/inventario/productos?ubicacion=X' },
        ],
        ['orden inexistente', { ruta: '/inventario/productos?orden=PRECIO' }],
        ['límite > 100', { ruta: '/inventario/productos?limite=101' }],
      ],
    },
    {
      metodo: 'post',
      ruta: '/inventario/productos',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'crear',
      cuerpo: { ...producto, nombre: '  Fertilizante 10-30-10  ' },
      argumentos: (u) => [expect.objectContaining(producto), u],
      invalidos: [
        ['nombre vacío', { cuerpo: { ...producto, nombre: '  ' } }],
        ['tipo inexistente', { cuerpo: { ...producto, tipoProducto: 'X' } }],
        ['unidad inexistente', { cuerpo: { ...producto, unidadMedida: 'X' } }],
        [
          'departamento inexistente',
          { cuerpo: { ...producto, departamento: 'X' } },
        ],
        ['ubicación inexistente', { cuerpo: { ...producto, ubicacion: 'X' } }],
        ['sin ubicación', { cuerpo: { ...producto, ubicacion: undefined } }],
        ['propiedad no permitida', { cuerpo: { ...producto, precio: 1 } }],
      ],
    },
    {
      metodo: 'get',
      ruta: '/inventario/productos/6',
      modulo: M,
      nivel: NivelPermiso.LECTURA,
      servicio: 'obtener',
      respuesta: { id: 6 },
      argumentos: (u) => [6, u],
      invalidos: [['id no numérico', { ruta: '/inventario/productos/abc' }]],
    },
    {
      metodo: 'patch',
      ruta: '/inventario/productos/6',
      modulo: M,
      nivel: NivelPermiso.COMPLETO,
      servicio: 'actualizar',
      cuerpo: producto,
      argumentos: (u) => [6, expect.objectContaining(producto), u],
      invalidos: [
        [
          'id no numérico',
          { ruta: '/inventario/productos/x', cuerpo: producto },
        ],
        ['sin nombre', { cuerpo: { ...producto, nombre: undefined } }],
        [
          'departamento inexistente',
          { cuerpo: { ...producto, departamento: 'X' } },
        ],
      ],
    },
  ],
});
