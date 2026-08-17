import { ConflictException } from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { Producto } from '../producto/entities/producto.entity';
import { UnidadMedida } from '../producto/enums/unidad-medida.enum';
import { Inventario } from './entities/inventario.entity';
import { MovimientoStock } from './entities/movimiento-stock.entity';
import { TipoMovimiento } from './enums/tipo-movimiento.enum';
import { StockService } from './stock.service';

describe('StockService', () => {
  const producto = {
    id: 7,
    nombre: 'Concentrado',
    unidadMedida: UnidadMedida.GRANEL,
    activo: true,
  } as Producto;

  const actor = { id: 'usuario-1' } as UsuarioAutenticado;

  let productosRepo: {
    findOneBy: jest.Mock;
  };
  let inventarioRepo: {
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let dataSource: {
    transaction: jest.Mock;
  };
  let service: StockService;

  beforeEach(() => {
    productosRepo = { findOneBy: jest.fn() };
    inventarioRepo = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn((valor: Inventario) => valor),
      save: jest.fn((valor: Inventario) => Promise.resolve(valor)),
    };
    dataSource = { transaction: jest.fn() };

    service = new StockService(
      productosRepo as unknown as Repository<Producto>,
      inventarioRepo as unknown as Repository<Inventario>,
      {} as Repository<MovimientoStock>,
      dataSource as unknown as DataSource,
    );
  });

  it('crea una única configuración con existencia inicial en cero', async () => {
    productosRepo.findOneBy.mockResolvedValue(producto);
    inventarioRepo.findOne.mockResolvedValue(null);

    const resultado = await service.crear({
      productoId: producto.id,
      stockMinimo: 5,
      precio: 1250,
    });

    expect(resultado.cantidad).toBe(0);
    expect(resultado.producto).toBe(producto);
    expect(inventarioRepo.save).toHaveBeenCalledTimes(1);
  });

  it('rechaza una segunda configuración para el mismo producto', async () => {
    productosRepo.findOneBy.mockResolvedValue(producto);
    inventarioRepo.findOne.mockResolvedValue({ id: 3 });

    await expect(
      service.crear({
        productoId: producto.id,
        stockMinimo: 5,
        precio: 1250,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(inventarioRepo.save).not.toHaveBeenCalled();
  });

  it('registra la entrada y obtiene la cantidad aplicada por la BD', async () => {
    const inventario = {
      id: 3,
      cantidad: 0,
      activo: true,
      producto,
    } as Inventario;
    const actualizado = { ...inventario, cantidad: 4 };
    inventarioRepo.findOne.mockResolvedValue(inventario);

    const queryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(inventario),
    };
    const manager = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      create: jest.fn(
        (_entidad: typeof MovimientoStock, valor: MovimientoStock) => valor,
      ),
      save: jest.fn((valor: MovimientoStock) => Promise.resolve(valor)),
      findOneBy: jest.fn().mockResolvedValue(actualizado),
    };
    dataSource.transaction.mockImplementation(
      (operacion: (manager: EntityManager) => unknown) =>
        operacion(manager as unknown as EntityManager),
    );

    const movimiento = await service.registrarEntrada(
      inventario.id,
      { cantidad: 4, fecha: '2026-08-16' },
      actor,
    );

    expect(movimiento.tipo).toBe(TipoMovimiento.ENTRADA);
    expect(movimiento.inventario.cantidad).toBe(4);
    expect(manager.save).toHaveBeenCalledTimes(1);
    expect(manager).not.toHaveProperty('increment');
  });

  it('registra la salida y obtiene la cantidad aplicada por la BD', async () => {
    const inventario = {
      id: 3,
      cantidad: 10,
      activo: true,
      producto,
    } as Inventario;
    const actualizado = { ...inventario, cantidad: 7 };
    inventarioRepo.findOne.mockResolvedValue(inventario);

    const queryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(inventario),
    };
    const manager = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      create: jest.fn(
        (_entidad: typeof MovimientoStock, valor: MovimientoStock) => valor,
      ),
      save: jest.fn((valor: MovimientoStock) => Promise.resolve(valor)),
      findOneBy: jest.fn().mockResolvedValue(actualizado),
    };
    dataSource.transaction.mockImplementation(
      (operacion: (manager: EntityManager) => unknown) =>
        operacion(manager as unknown as EntityManager),
    );

    const movimiento = await service.registrarSalida(
      inventario.id,
      { cantidad: 3, fecha: '2026-08-16', motivo: 'Consumo' },
      actor,
    );

    expect(movimiento.tipo).toBe(TipoMovimiento.SALIDA);
    expect(movimiento.inventario.cantidad).toBe(7);
    expect(manager.save).toHaveBeenCalledTimes(1);
    expect(manager).not.toHaveProperty('decrement');
  });
});
