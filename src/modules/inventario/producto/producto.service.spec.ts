/* eslint-disable @typescript-eslint/no-unsafe-member-access -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas unitarias - ProductoService (soporte de /inventario/productos)
 *
 * Usa la InventarioPolicy real. La transacción de TypeORM se simula con un
 * EntityManager cuyo createQueryBuilder devuelve builders programables.
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import {
  crearQueryBuilderSimulado,
  crearRepositorioSimulado,
  type QueryBuilderSimulado,
} from '../../../../test/helpers/typeorm-mocks';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { InventarioPolicy } from '../inventario.policy';
import { Departamento } from './enums/departamento.enum';
import { OrdenProductos } from './enums/orden-productos.enum';
import { TipoProducto } from './enums/tipo-producto.enum';
import { Ubicacion } from './enums/ubicacion.enum';
import { UnidadMedida } from './enums/unidad-medida.enum';
import { ProductoService } from './producto.service';

const usuario = (rol: RolUsuario) => ({
  id: 'u-1',
  correo: 'a@x.cr',
  nombre: 'A',
  rol,
});
const admin = usuario(RolUsuario.ADMINISTRADOR);
const dto = {
  nombre: 'Fertilizante',
  tipoProducto: TipoProducto.INSUMO,
  unidadMedida: UnidadMedida.UNIDAD,
  departamento: Departamento.AGRICOLA,
  ubicacion: Ubicacion.BODEGA_AGRICOLA,
};
const producto = (extra: Record<string, unknown> = {}) => ({
  id: 6,
  ...dto,
  activo: true,
  configuracionStock: null,
  inventario: null,
  creadoEn: new Date('2026-01-01'),
  actualizadoEn: new Date('2026-01-02'),
  ...extra,
});

describe('ProductoService', () => {
  let repo: ReturnType<typeof crearRepositorioSimulado>;
  let servicio: ProductoService;
  let manager: {
    createQueryBuilder: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    count: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  /** Builders que devuelve manager.createQueryBuilder, en orden de llamada. */
  let builders: QueryBuilderSimulado[];

  beforeEach(() => {
    repo = crearRepositorioSimulado();
    builders = [];
    manager = {
      createQueryBuilder: jest.fn(
        () => builders.shift() ?? crearQueryBuilderSimulado(),
      ),
      save: jest.fn((e: object) =>
        Promise.resolve({
          id: 6,
          creadoEn: new Date(),
          actualizadoEn: new Date(),
          activo: true,
          ...e,
        }),
      ),
      create: jest.fn((_clase: unknown, datos: object) => datos),
      count: jest.fn().mockResolvedValue(0),
    };
    dataSource = {
      transaction: jest.fn((fn: (m: typeof manager) => unknown) => fn(manager)),
    };
    servicio = new ProductoService(
      repo as never,
      dataSource as never,
      new InventarioPolicy(),
    );
  });

  describe('listar (GET)', () => {
    it('solo productos activos, ordenados por nombre', async () => {
      repo.qb.getManyAndCount.mockResolvedValue([[producto()], 1]);

      const r = await servicio.listar(
        { pagina: 1, limite: 10, orden: OrdenProductos.NOMBRE },
        admin,
      );

      expect(repo.qb.where).toHaveBeenCalledWith('producto.activo = true');
      expect(repo.qb.orderBy).toHaveBeenCalledWith('producto.nombre', 'ASC');
      expect(r.datos).toHaveLength(1);
      expect(r.meta.total).toBe(1);
    });

    it('orden por categoría: tipo, luego nombre', async () => {
      await servicio.listar(
        { pagina: 1, limite: 10, orden: OrdenProductos.CATEGORIA },
        admin,
      );
      expect(repo.qb.orderBy).toHaveBeenCalledWith(
        'producto.tipoProducto',
        'ASC',
      );
      expect(repo.qb.addOrderBy).toHaveBeenCalledWith('producto.nombre', 'ASC');
    });

    it('administrador: puede filtrar por cualquier departamento, tipo, nombre y ubicación', async () => {
      await servicio.listar(
        {
          nombre: 'fert',
          tipoProducto: TipoProducto.INSUMO,
          departamento: Departamento.PECUARIO,
          ubicacion: Ubicacion.TALLER,
          pagina: 1,
          limite: 10,
        } as never,
        admin,
      );
      expect(repo.qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        { nombre: '%fert%' },
      );
      expect(repo.qb.andWhere).toHaveBeenCalledWith(
        'producto.tipo_producto = :tipoProducto',
        { tipoProducto: TipoProducto.INSUMO },
      );
      expect(repo.qb.andWhere).toHaveBeenCalledWith(
        'producto.departamento = :departamento',
        { departamento: Departamento.PECUARIO },
      );
      expect(repo.qb.andWhere).toHaveBeenCalledWith(
        'producto.ubicacion = :ubicacion',
        { ubicacion: Ubicacion.TALLER },
      );
    });

    it('docente: se fuerza a su departamento e ignora el filtro enviado', async () => {
      await servicio.listar(
        { departamento: Departamento.PECUARIO, pagina: 1, limite: 10 } as never,
        usuario(RolUsuario.DOCENTE_AGRICOLA),
      );
      expect(repo.qb.andWhere).toHaveBeenCalledWith(
        'producto.departamento = :departamentoPermitido',
        {
          departamentoPermitido: Departamento.AGRICOLA,
        },
      );
      expect(repo.qb.andWhere).not.toHaveBeenCalledWith(
        'producto.departamento = :departamento',
        expect.anything(),
      );
    });
  });

  describe('obtener (GET :id)', () => {
    it('administrador ve cualquier producto', async () => {
      repo.qb.getOne.mockResolvedValue(producto());
      expect(await servicio.obtener(6, admin)).toMatchObject({
        id: 6,
        nombre: 'Fertilizante',
      });
    });

    it('404 si no existe o está inactivo', async () => {
      repo.qb.getOne.mockResolvedValue(null);
      await expect(servicio.obtener(6, admin)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('docente de otro departamento: 403', async () => {
      repo.qb.getOne.mockResolvedValue(producto());
      await expect(
        servicio.obtener(6, usuario(RolUsuario.DOCENTE_PECUARIO)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it.each([
      RolUsuario.DOCENTE_AGRICOLA,
      RolUsuario.DIRECTORA,
      RolUsuario.ESTUDIANTE,
    ])('%s puede leer productos del área agrícola', async (rol) => {
      repo.qb.getOne.mockResolvedValue(producto());
      await expect(servicio.obtener(6, usuario(rol))).resolves.toBeDefined();
    });
  });

  describe('crear (POST)', () => {
    it('crea el producto y su auditoría en la misma transacción', async () => {
      builders.push(crearQueryBuilderSimulado({ getOne: null }));

      const r = await servicio.crear(dto, admin);

      expect(manager.save).toHaveBeenCalledTimes(2);
      expect(manager.create).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.objectContaining({
          ...dto,
          creadoPor: 'u-1',
          actualizadoPor: null,
        }),
      );
      expect(manager.create).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        expect.objectContaining({
          accion: 'CREAR',
          recurso: 'PRODUCTO',
          actorId: 'u-1',
          datos: dto,
        }),
      );
      expect(r).toMatchObject({ nombre: 'Fertilizante' });
    });

    it('nombre ya usado por un producto activo: 409', async () => {
      builders.push(crearQueryBuilderSimulado({ getOne: producto() }));
      await expect(servicio.crear(dto, admin)).rejects.toThrow(
        new ConflictException('Ya existe un producto llamado "Fertilizante".'),
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('carrera: violación UNIQUE de Postgres también da 409', async () => {
      dataSource.transaction.mockRejectedValue(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('dup'), { code: '23505' }),
        ),
      );
      await expect(servicio.crear(dto, admin)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it.each([
      RolUsuario.DOCENTE_AGRICOLA,
      RolUsuario.DOCENTE_PECUARIO,
      RolUsuario.DIRECTORA,
      RolUsuario.ESTUDIANTE,
    ])(
      '%s: 403 (solo el administrador crea productos), sin abrir transacción',
      async (rol) => {
        await expect(servicio.crear(dto, usuario(rol))).rejects.toBeInstanceOf(
          ForbiddenException,
        );
        expect(dataSource.transaction).not.toHaveBeenCalled();
      },
    );
  });

  describe('actualizar (PATCH :id)', () => {
    /** Builders en orden: producto bloqueado, duplicado, [inventario, configuración]. */
    function armar(
      opts: {
        producto?: unknown;
        duplicado?: unknown;
        inventario?: unknown;
        configuracion?: unknown;
      } = {},
    ) {
      builders.push(
        crearQueryBuilderSimulado({
          getOne: 'producto' in opts ? opts.producto : producto(),
        }),
        crearQueryBuilderSimulado({ getOne: opts.duplicado ?? null }),
        crearQueryBuilderSimulado({ getOne: opts.inventario ?? null }),
        crearQueryBuilderSimulado({ getOne: opts.configuracion ?? null }),
      );
      repo.qb.getOne.mockResolvedValue(producto({ nombre: 'Nuevo' }));
    }

    it('actualiza con bloqueo pesimista, audita anterior y nuevo y devuelve el producto recargado', async () => {
      armar();
      const primero = builders[0];

      const r = await servicio.actualizar(
        6,
        { ...dto, nombre: 'Nuevo' },
        admin,
      );

      expect(primero.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(manager.save).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'Nuevo', actualizadoPor: 'u-1' }),
      );
      const auditoria = manager.create.mock.calls[0][1] as {
        accion: string;
        datos: { anterior: { nombre: string }; nuevo: { nombre: string } };
      };
      expect(auditoria.accion).toBe('EDITAR');
      expect(auditoria.datos.anterior.nombre).toBe('Fertilizante');
      expect(auditoria.datos.nuevo.nombre).toBe('Nuevo');
      expect(r.nombre).toBe('Nuevo');
    });

    it('404 si no existe', async () => {
      armar({ producto: null });
      await expect(servicio.actualizar(6, dto, admin)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('409 si otro producto activo ya tiene ese nombre', async () => {
      armar({ duplicado: producto({ id: 7 }) });
      await expect(servicio.actualizar(6, dto, admin)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    describe('cambio de unidad de medida', () => {
      const cambio = { ...dto, unidadMedida: UnidadMedida.Kilogramo };

      it('permitido cuando no hay movimientos', async () => {
        armar({ inventario: { id: 1, cantidadActual: 3 } });
        manager.count.mockResolvedValue(0);
        await expect(
          servicio.actualizar(6, cambio, admin),
        ).resolves.toBeDefined();
      });

      it('409 si el inventario ya tiene movimientos', async () => {
        armar({ inventario: { id: 1, cantidadActual: 3 } });
        manager.count.mockResolvedValue(2);
        await expect(servicio.actualizar(6, cambio, admin)).rejects.toThrow(
          'No se puede cambiar la unidad de un producto con movimientos.',
        );
        expect(manager.save).not.toHaveBeenCalled();
      });

      it('sin inventario no consulta movimientos', async () => {
        armar();
        await servicio.actualizar(6, cambio, admin);
        expect(manager.count).not.toHaveBeenCalled();
      });

      it('a UNIDAD con saldo decimal: 400', async () => {
        armar({
          producto: producto({ unidadMedida: UnidadMedida.Kilogramo }),
          inventario: { id: 1, cantidadActual: 2.5 },
        });
        await expect(
          servicio.actualizar(
            6,
            { ...dto, unidadMedida: UnidadMedida.UNIDAD },
            admin,
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('a UNIDAD con stock mínimo decimal: 400', async () => {
        armar({
          producto: producto({ unidadMedida: UnidadMedida.Kilogramo }),
          configuracion: { stockMinimo: 1.5 },
        });
        await expect(
          servicio.actualizar(
            6,
            { ...dto, unidadMedida: UnidadMedida.UNIDAD },
            admin,
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('a UNIDAD con valores enteros: permitido', async () => {
        armar({
          producto: producto({ unidadMedida: UnidadMedida.Kilogramo }),
          inventario: { id: 1, cantidadActual: 4 },
          configuracion: { stockMinimo: 2 },
        });
        await expect(
          servicio.actualizar(
            6,
            { ...dto, unidadMedida: UnidadMedida.UNIDAD },
            admin,
          ),
        ).resolves.toBeDefined();
      });

      it('misma unidad: no revisa inventario ni configuración', async () => {
        armar();
        await servicio.actualizar(6, dto, admin);
        expect(builders).toHaveLength(2);
      });
    });

    it('violación UNIQUE al guardar: 409', async () => {
      dataSource.transaction.mockRejectedValue(
        new QueryFailedError(
          'UPDATE',
          [],
          Object.assign(new Error('dup'), { code: '23505' }),
        ),
      );
      await expect(servicio.actualizar(6, dto, admin)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it.each([
      RolUsuario.DOCENTE_AGRICOLA,
      RolUsuario.DOCENTE_PECUARIO,
      RolUsuario.DIRECTORA,
      RolUsuario.ESTUDIANTE,
    ])('%s: 403 sin abrir transacción', async (rol) => {
      await expect(
        servicio.actualizar(6, dto, usuario(rol)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });
});

describe('InventarioPolicy', () => {
  const policy = new InventarioPolicy();
  const u = (rol: RolUsuario) => ({ id: '1', correo: 'a', nombre: 'a', rol });

  it.each([
    [RolUsuario.DOCENTE_AGRICOLA, Departamento.AGRICOLA],
    [RolUsuario.DOCENTE_PECUARIO, Departamento.PECUARIO],
    [RolUsuario.ADMINISTRADOR, undefined],
    [RolUsuario.DIRECTORA, undefined],
    [RolUsuario.ESTUDIANTE, undefined],
  ])('limitarDepartamento(%s) = %s', (rol, esperado) => {
    expect(policy.limitarDepartamento(u(rol))).toBe(esperado);
  });

  it('exigirMovimiento: admin en todo, docente solo en su departamento', () => {
    expect(() =>
      policy.exigirMovimiento(
        u(RolUsuario.ADMINISTRADOR),
        Departamento.PECUARIO,
      ),
    ).not.toThrow();
    expect(() =>
      policy.exigirMovimiento(
        u(RolUsuario.DOCENTE_PECUARIO),
        Departamento.PECUARIO,
      ),
    ).not.toThrow();
    expect(() =>
      policy.exigirMovimiento(
        u(RolUsuario.DOCENTE_PECUARIO),
        Departamento.AGRICOLA,
      ),
    ).toThrow(ForbiddenException);
    expect(() =>
      policy.exigirMovimiento(
        u(RolUsuario.DOCENTE_PECUARIO),
        Departamento.GENERAL,
      ),
    ).toThrow(ForbiddenException);
    expect(() =>
      policy.exigirMovimiento(u(RolUsuario.DIRECTORA), Departamento.AGRICOLA),
    ).toThrow(ForbiddenException);
    expect(() =>
      policy.exigirMovimiento(u(RolUsuario.ESTUDIANTE), Departamento.AGRICOLA),
    ).toThrow(ForbiddenException);
  });
});
