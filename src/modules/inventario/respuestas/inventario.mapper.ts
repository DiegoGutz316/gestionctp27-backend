import type { Producto } from '../producto/entities/producto.entity';
import type { Departamento } from '../producto/enums/departamento.enum';
import type { TipoProducto } from '../producto/enums/tipo-producto.enum';
import type { Ubicacion } from '../producto/enums/ubicacion.enum';
import type { UnidadMedida } from '../producto/enums/unidad-medida.enum';
import type { ConfiguracionStock } from '../stock/entities/configuracion-stock.entity';
import type { Inventario } from '../stock/entities/inventario.entity';
import type { MovimientoStock } from '../stock/entities/movimiento-stock.entity';
import type { TipoMovimiento } from '../stock/enums/tipo-movimiento.enum';

export interface ProductoResumenRespuesta {
  id: number;
  nombre: string;
  tipoProducto: TipoProducto;
  unidadMedida: UnidadMedida;
  departamento: Departamento;
  ubicacion: Ubicacion;
  activo: boolean;
}

export interface ConfiguracionStockRespuesta {
  id: number;
  producto: ProductoResumenRespuesta;
  stockMinimo: number;
  precio: number;
  activo: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface InventarioRespuesta {
  id: number;
  producto: ProductoResumenRespuesta;
  cantidadActual: number;
  activo: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface ProductoRespuesta extends ProductoResumenRespuesta {
  configuracionStock: Omit<ConfiguracionStockRespuesta, 'producto'> | null;
  inventario: Omit<InventarioRespuesta, 'producto'> | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface MovimientoRespuesta {
  id: number;
  tipo: TipoMovimiento;
  cantidad: number;
  fecha: string;
  origen: string | null;
  motivo: string | null;
  productoNombre: string;
  unidadMedida: UnidadMedida;
  departamento: Departamento;
  precioUnitario: number;
  creadoEn: Date;
  inventario: InventarioRespuesta;
  responsable: { id: string; nombre: string } | null;
}

function mapearProductoResumen(producto: Producto): ProductoResumenRespuesta {
  return {
    id: producto.id,
    nombre: producto.nombre,
    tipoProducto: producto.tipoProducto,
    unidadMedida: producto.unidadMedida,
    departamento: producto.departamento,
    ubicacion: producto.ubicacion,
    activo: producto.activo,
  };
}

export function mapearConfiguracionStock(
  configuracion: ConfiguracionStock,
): ConfiguracionStockRespuesta {
  return {
    id: configuracion.id,
    producto: mapearProductoResumen(configuracion.producto),
    stockMinimo: configuracion.stockMinimo,
    precio: configuracion.precio,
    activo: configuracion.activo,
    creadoEn: configuracion.creadoEn,
    actualizadoEn: configuracion.actualizadoEn,
  };
}

export function mapearInventario(inventario: Inventario): InventarioRespuesta {
  return {
    id: inventario.id,
    producto: mapearProductoResumen(inventario.producto),
    cantidadActual: inventario.cantidadActual,
    activo: inventario.activo,
    creadoEn: inventario.creadoEn,
    actualizadoEn: inventario.actualizadoEn,
  };
}

export function mapearProducto(producto: Producto): ProductoRespuesta {
  const respuesta: ProductoRespuesta = {
    ...mapearProductoResumen(producto),
    configuracionStock: null,
    inventario: null,
    creadoEn: producto.creadoEn,
    actualizadoEn: producto.actualizadoEn,
  };
  if (producto.configuracionStock) {
    respuesta.configuracionStock = {
      id: producto.configuracionStock.id,
      stockMinimo: producto.configuracionStock.stockMinimo,
      precio: producto.configuracionStock.precio,
      activo: producto.configuracionStock.activo,
      creadoEn: producto.configuracionStock.creadoEn,
      actualizadoEn: producto.configuracionStock.actualizadoEn,
    };
  }
  if (producto.inventario) {
    respuesta.inventario = {
      id: producto.inventario.id,
      cantidadActual: producto.inventario.cantidadActual,
      activo: producto.inventario.activo,
      creadoEn: producto.inventario.creadoEn,
      actualizadoEn: producto.inventario.actualizadoEn,
    };
  }
  return respuesta;
}

export function mapearMovimiento(
  movimiento: MovimientoStock,
): MovimientoRespuesta {
  return {
    id: movimiento.id,
    tipo: movimiento.tipo,
    cantidad: movimiento.cantidad,
    fecha: movimiento.fecha,
    origen: movimiento.origen,
    motivo: movimiento.motivo,
    productoNombre: movimiento.productoNombre,
    unidadMedida: movimiento.unidadMedida,
    departamento: movimiento.departamento,
    precioUnitario: movimiento.precioUnitario,
    creadoEn: movimiento.creadoEn,
    inventario: mapearInventario(movimiento.inventario),
    responsable: movimiento.responsable
      ? {
          id: movimiento.responsable.id,
          nombre: movimiento.responsable.nombre,
        }
      : null,
  };
}
