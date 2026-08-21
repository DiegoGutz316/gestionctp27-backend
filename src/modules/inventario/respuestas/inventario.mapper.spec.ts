import { Producto } from '../producto/entities/producto.entity';
import { Departamento } from '../producto/enums/departamento.enum';
import { TipoProducto } from '../producto/enums/tipo-producto.enum';
import { Ubicacion } from '../producto/enums/ubicacion.enum';
import { UnidadMedida } from '../producto/enums/unidad-medida.enum';
import { ConfiguracionStock } from '../stock/entities/configuracion-stock.entity';
import { Inventario } from '../stock/entities/inventario.entity';
import { mapearProducto } from './inventario.mapper';

describe('mapeadores de inventario', () => {
  it('expone configuración e inventario separados y nunca stock', () => {
    const fecha = new Date('2026-01-01T00:00:00Z');
    const producto = Object.assign(new Producto(), {
      id: 1,
      nombre: 'Semilla',
      tipoProducto: TipoProducto.INSUMO,
      unidadMedida: UnidadMedida.Kilo,
      departamento: Departamento.AGRICOLA,
      ubicacion: Ubicacion.BODEGA_AGRICOLA,
      activo: true,
      creadoEn: fecha,
      actualizadoEn: fecha,
    });
    producto.configuracionStock = Object.assign(new ConfiguracionStock(), {
      id: 2,
      producto,
      stockMinimo: 3,
      precio: 500,
      activo: true,
      creadoEn: fecha,
      actualizadoEn: fecha,
    });
    producto.inventario = Object.assign(new Inventario(), {
      id: 4,
      producto,
      cantidadActual: 10,
      activo: true,
      creadoEn: fecha,
      actualizadoEn: fecha,
    });

    const respuesta = mapearProducto(producto);
    expect(respuesta.configuracionStock?.stockMinimo).toBe(3);
    expect(respuesta.inventario?.cantidadActual).toBe(10);
    expect(respuesta).not.toHaveProperty('stock');
  });
});
