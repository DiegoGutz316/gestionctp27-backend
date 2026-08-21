import type { DataSource, EntityManager, Repository } from 'typeorm';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { AuditoriaInventario } from '../entities/auditoria-inventario.entity';
import { InventarioPolicy } from '../inventario.policy';
import { Producto } from '../producto/entities/producto.entity';
import { Departamento } from '../producto/enums/departamento.enum';
import { TipoProducto } from '../producto/enums/tipo-producto.enum';
import { Ubicacion } from '../producto/enums/ubicacion.enum';
import { UnidadMedida } from '../producto/enums/unidad-medida.enum';
import { ConfiguracionStock } from './entities/configuracion-stock.entity';
import { IdempotenciaMovimiento } from './entities/idempotencia-movimiento.entity';
import { Inventario } from './entities/inventario.entity';
import { MovimientoStock } from './entities/movimiento-stock.entity';
import { TipoMovimiento } from './enums/tipo-movimiento.enum';
import { crearHuellaMovimiento, StockService } from './stock.service';

describe('StockService', () => {
  const actor: UsuarioAutenticado = {
    id: 'b62082bb-17b7-49c1-994b-538d77bc814a',
    correo: 'admin@ctp.test',
    nombre: 'Admin',
    rol: RolUsuario.ADMINISTRADOR,
  };
  const producto = {
    id: 7,
    nombre: 'Concentrado',
    tipoProducto: TipoProducto.INSUMO,
    unidadMedida: UnidadMedida.Kilo,
    departamento: Departamento.PECUARIO,
    ubicacion: Ubicacion.BODEGA_PECUARIA,
    activo: true,
    creadoEn: new Date('2026-01-01T00:00:00Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00Z'),
  } as Producto;

  const policy = new InventarioPolicy();

  it('crea configuración e inventario cero en una única transacción', async () => {
    const productoQuery = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(producto),
    };
    const manager = {
      createQueryBuilder: jest.fn().mockReturnValue(productoQuery),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((_entidad: unknown, valor: object) => valor),
      save: jest.fn((valor: Record<string, unknown>) => {
        if ('stockMinimo' in valor) return Promise.resolve({ id: 3, ...valor });
        if ('cantidadActual' in valor)
          return Promise.resolve({ id: 3, ...valor });
        return Promise.resolve({ id: 1, ...valor });
      }),
    };
    const dataSource = {
      transaction: jest.fn((operacion: (m: EntityManager) => unknown) =>
        operacion(manager as unknown as EntityManager),
      ),
    };
    const service = crearServicio(dataSource);

    const resultado = await service.crearConfiguracion(
      { productoId: 7, stockMinimo: 5, precio: 1250 },
      actor,
    );

    expect(resultado.stockMinimo).toBe(5);
    expect(manager.save).toHaveBeenCalledWith(
      expect.objectContaining({ cantidadActual: 0, producto }),
    );
    expect(manager.create).toHaveBeenCalledWith(
      AuditoriaInventario,
      expect.objectContaining({ recursoId: 3, actorId: actor.id }),
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('devuelve el movimiento reservado sin volver a aplicar el trigger', async () => {
    const inventario = {
      id: 3,
      producto,
      cantidadActual: 8,
      activo: true,
      creadoEn: new Date('2026-01-01T00:00:00Z'),
      actualizadoEn: new Date('2026-01-02T00:00:00Z'),
    } as Inventario;
    const movimiento = {
      id: 12,
      tipo: TipoMovimiento.ENTRADA,
      cantidad: 8,
      fecha: '2026-08-15',
      origen: 'Compra',
      motivo: null,
      productoNombre: producto.nombre,
      unidadMedida: producto.unidadMedida,
      departamento: producto.departamento,
      precioUnitario: 100,
      creadoEn: new Date('2026-08-15T12:00:00Z'),
      inventario,
      responsable: { id: actor.id, nombre: actor.nombre },
    } as MovimientoStock;
    const dto = { cantidad: 8, fecha: '2026-08-15', origen: 'Compra' };
    const huella = crearHuellaMovimiento(
      inventario.id,
      TipoMovimiento.ENTRADA,
      dto,
    );
    const insertar = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    };
    const reservaQuery = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 2,
        huella,
        movimientoId: movimiento.id,
      }),
    };
    const movimientoQuery = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(movimiento),
    };
    const manager = {
      createQueryBuilder: jest.fn((entidad?: unknown) => {
        if (!entidad) return insertar;
        if (entidad === IdempotenciaMovimiento) return reservaQuery;
        if (entidad === MovimientoStock) return movimientoQuery;
        throw new Error('No debía consultar otra entidad');
      }),
      save: jest.fn(),
    };
    const dataSource = {
      transaction: jest.fn((operacion: (m: EntityManager) => unknown) =>
        operacion(manager as unknown as EntityManager),
      ),
    };
    const service = crearServicio(dataSource);
    const resultado = await service.registrarEntrada(
      inventario.id,
      dto,
      actor,
      '550e8400-e29b-41d4-a716-446655440000',
    );

    expect(resultado.id).toBe(movimiento.id);
    expect(resultado.inventario.cantidadActual).toBe(8);
    expect(manager.save).not.toHaveBeenCalled();
  });

  function crearServicio(dataSource: { transaction: jest.Mock }): StockService {
    return new StockService(
      {} as Repository<ConfiguracionStock>,
      {} as Repository<Inventario>,
      {} as Repository<MovimientoStock>,
      dataSource as unknown as DataSource,
      policy,
    );
  }
});
