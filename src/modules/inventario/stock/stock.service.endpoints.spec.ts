/* eslint-disable @typescript-eslint/no-unsafe-member-access -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas unitarias - StockService: reglas de negocio de los endpoints de
 * /inventario (configuración de stock, existencias, movimientos).
 * Complementa stock.service.spec.ts e stock.idempotencia.spec.ts.
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
import { Departamento } from '../producto/enums/departamento.enum';
import { TipoProducto } from '../producto/enums/tipo-producto.enum';
import { Ubicacion } from '../producto/enums/ubicacion.enum';
import { UnidadMedida } from '../producto/enums/unidad-medida.enum';
import { TipoMovimiento } from './enums/tipo-movimiento.enum';
import { StockService } from './stock.service';

const usuario = (rol: RolUsuario) => ({
  id: 'u-1',
  correo: 'a@x.cr',
  nombre: 'A',
  rol,
});
const admin = usuario(RolUsuario.ADMINISTRADOR);
const CLAVE = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const producto = (extra: Record<string, unknown> = {}) => ({
  id: 7,
  nombre: 'Concentrado',
  tipoProducto: TipoProducto.INSUMO,
  unidadMedida: UnidadMedida.Kilogramo,
  departamento: Departamento.PECUARIO,
  ubicacion: Ubicacion.BODEGA_PECUARIA,
  activo: true,
  ...extra,
});
const configuracion = (extra: Record<string, unknown> = {}) => ({
  id: 3,
  producto: producto(),
  stockMinimo: 5,
  precio: 1500,
  activo: true,
  creadoEn: new Date(),
  actualizadoEn: new Date(),
  ...extra,
});
const inventario = (extra: Record<string, unknown> = {}) => ({
  id: 4,
  producto: producto({
    configuracionStock: { stockMinimo: 5, precio: 1500, activo: true },
  }),
  cantidadActual: 20,
  activo: true,
  creadoEn: new Date(),
  actualizadoEn: new Date(),
  ...extra,
});

describe('StockService - reglas de negocio', () => {
  let configs: ReturnType<typeof crearRepositorioSimulado>;
  let inventarios: ReturnType<typeof crearRepositorioSimulado>;
  let movimientos: ReturnType<typeof crearRepositorioSimulado>;
  let manager: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let builders: QueryBuilderSimulado[];
  let dataSource: { transaction: jest.Mock };
  const notificaciones = { notificarStockBajo: jest.fn() };
  let servicio: StockService;

  beforeEach(() => {
    jest.resetAllMocks();
    configs = crearRepositorioSimulado();
    inventarios = crearRepositorioSimulado();
    movimientos = crearRepositorioSimulado();
    builders = [];
    manager = {
      createQueryBuilder: jest.fn(
        () => builders.shift() ?? crearQueryBuilderSimulado(),
      ),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((_c: unknown, d: object) => d),
      save: jest.fn((e: object) =>
        Promise.resolve({
          id: 11,
          creadoEn: new Date(),
          actualizadoEn: new Date(),
          ...e,
        }),
      ),
      update: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn((fn: (m: typeof manager) => unknown) => fn(manager)),
    };
    notificaciones.notificarStockBajo.mockResolvedValue(undefined);
    servicio = new StockService(
      configs as never,
      inventarios as never,
      movimientos as never,
      dataSource as never,
      new InventarioPolicy(),
      notificaciones as never,
    );
  });

  describe('crearConfiguracion (POST /inventario/configuracion-stock)', () => {
    const dto = { productoId: 7, stockMinimo: 5, precio: 1500 };

    it.each([
      RolUsuario.DOCENTE_AGRICOLA,
      RolUsuario.DOCENTE_PECUARIO,
      RolUsuario.DIRECTORA,
      RolUsuario.ESTUDIANTE,
    ])('%s: 403 (solo administrador)', async (rol) => {
      await expect(
        servicio.crearConfiguracion(dto, usuario(rol)),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('404 si el producto no existe o está inactivo', async () => {
      builders.push(crearQueryBuilderSimulado({ getOne: null }));
      await expect(
        servicio.crearConfiguracion(dto, admin),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('400 si el producto es por UNIDAD y el stock mínimo es decimal', async () => {
      builders.push(
        crearQueryBuilderSimulado({
          getOne: producto({ unidadMedida: UnidadMedida.UNIDAD }),
        }),
      );
      await expect(
        servicio.crearConfiguracion({ ...dto, stockMinimo: 2.5 }, admin),
      ).rejects.toThrow(
        'El stock mínimo debe ser un número entero para productos por unidad.',
      );
    });

    it('409 si el producto ya tiene configuración', async () => {
      builders.push(crearQueryBuilderSimulado({ getOne: producto() }));
      manager.findOne.mockResolvedValue({ id: 1 });
      await expect(servicio.crearConfiguracion(dto, admin)).rejects.toThrow(
        'El producto ya tiene una configuración de stock.',
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('carrera: UNIQUE de Postgres también da 409', async () => {
      dataSource.transaction.mockRejectedValue(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('dup'), { code: '23505' }),
        ),
      );
      await expect(
        servicio.crearConfiguracion(dto, admin),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('otros errores se propagan', async () => {
      const fallo = new Error('caída');
      dataSource.transaction.mockRejectedValue(fallo);
      await expect(servicio.crearConfiguracion(dto, admin)).rejects.toBe(fallo);
    });
  });

  describe('obtenerConfiguracion (GET /inventario/configuracion-stock/:id)', () => {
    it('devuelve la configuración mapeada', async () => {
      configs.findOne.mockResolvedValue(configuracion());
      expect(await servicio.obtenerConfiguracion(3, admin)).toMatchObject({
        id: 3,
        stockMinimo: 5,
        precio: 1500,
        producto: { id: 7 },
      });
    });

    it('404 si no existe', async () => {
      configs.findOne.mockResolvedValue(null);
      await expect(
        servicio.obtenerConfiguracion(3, admin),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('docente de otro departamento: 403', async () => {
      configs.findOne.mockResolvedValue(configuracion());
      await expect(
        servicio.obtenerConfiguracion(3, usuario(RolUsuario.DOCENTE_AGRICOLA)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('actualizarConfiguracion (PATCH /inventario/configuracion-stock/:id)', () => {
    it('400 si no se envía ningún campo, sin abrir transacción', async () => {
      await expect(
        servicio.actualizarConfiguracion(3, {}, admin),
      ).rejects.toThrow('Indique al menos un campo para actualizar.');
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it.each([
      RolUsuario.DOCENTE_PECUARIO,
      RolUsuario.DIRECTORA,
      RolUsuario.ESTUDIANTE,
    ])('%s: 403', async (rol) => {
      await expect(
        servicio.actualizarConfiguracion(3, { activo: false }, usuario(rol)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('actualiza solo lo enviado, audita anterior/nuevo y devuelve la configuración recargada', async () => {
      const c = configuracion();
      builders.push(crearQueryBuilderSimulado({ getOne: c }));
      configs.findOne.mockResolvedValue(configuracion({ precio: 2000 }));

      const r = await servicio.actualizarConfiguracion(
        3,
        { precio: 2000 },
        admin,
      );

      expect(c).toMatchObject({
        stockMinimo: 5,
        precio: 2000,
        activo: true,
        actualizadoPor: 'u-1',
      });
      const auditoria = manager.create.mock.calls[0][1] as {
        datos: { anterior: { precio: number }; nuevo: { precio: number } };
      };
      expect(auditoria.datos.anterior.precio).toBe(1500);
      expect(auditoria.datos.nuevo.precio).toBe(2000);
      expect(r.precio).toBe(2000);
    });

    it('404 si la configuración no existe', async () => {
      builders.push(crearQueryBuilderSimulado({ getOne: null }));
      await expect(
        servicio.actualizarConfiguracion(3, { activo: false }, admin),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('400 si el producto está inactivo', async () => {
      builders.push(
        crearQueryBuilderSimulado({
          getOne: configuracion({ producto: producto({ activo: false }) }),
        }),
      );
      await expect(
        servicio.actualizarConfiguracion(3, { activo: false }, admin),
      ).rejects.toThrow('El producto está inactivo.');
    });

    it('400 si el stock mínimo es decimal en un producto por UNIDAD', async () => {
      builders.push(
        crearQueryBuilderSimulado({
          getOne: configuracion({
            producto: producto({ unidadMedida: UnidadMedida.UNIDAD }),
          }),
        }),
      );
      await expect(
        servicio.actualizarConfiguracion(3, { stockMinimo: 1.5 }, admin),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('listarExistencias (GET /inventario/existencias)', () => {
    it('solo existencias y productos activos, ordenadas por nombre', async () => {
      inventarios.qb.getManyAndCount.mockResolvedValue([[inventario()], 1]);
      const r = await servicio.listarExistencias(
        { pagina: 1, limite: 10 },
        admin,
      );
      expect(inventarios.qb.where).toHaveBeenCalledWith(
        'inventario.activo = true',
      );
      expect(inventarios.qb.andWhere).toHaveBeenCalledWith(
        'producto.activo = true',
      );
      expect(r.datos[0]).toMatchObject({ id: 4, cantidadActual: 20 });
    });

    it('administrador filtra por producto y departamento', async () => {
      await servicio.listarExistencias(
        {
          productoId: 7,
          departamento: Departamento.GENERAL,
          pagina: 1,
          limite: 10,
        },
        admin,
      );
      expect(inventarios.qb.andWhere).toHaveBeenCalledWith(
        'inventario.producto_id = :productoId',
        { productoId: 7 },
      );
      expect(inventarios.qb.andWhere).toHaveBeenCalledWith(
        'producto.departamento = :departamento',
        { departamento: Departamento.GENERAL },
      );
    });

    it('docente: se limita a su departamento aunque pida otro', async () => {
      await servicio.listarExistencias(
        { departamento: Departamento.AGRICOLA, pagina: 1, limite: 10 },
        usuario(RolUsuario.DOCENTE_PECUARIO),
      );
      expect(inventarios.qb.andWhere).toHaveBeenCalledWith(
        'producto.departamento = :departamentoPermitido',
        { departamentoPermitido: Departamento.PECUARIO },
      );
      expect(inventarios.qb.andWhere).not.toHaveBeenCalledWith(
        'producto.departamento = :departamento',
        expect.anything(),
      );
    });
  });

  describe('obtenerExistencia (GET /inventario/existencias/:id)', () => {
    it('devuelve la existencia', async () => {
      inventarios.qb.getOne.mockResolvedValue(inventario());
      expect(await servicio.obtenerExistencia(4, admin)).toMatchObject({
        id: 4,
      });
    });

    it('404 si no existe o está inactiva', async () => {
      inventarios.qb.getOne.mockResolvedValue(null);
      await expect(servicio.obtenerExistencia(4, admin)).rejects.toThrow(
        'La existencia no existe o está inactiva.',
      );
    });

    it('docente de otro departamento: 403', async () => {
      inventarios.qb.getOne.mockResolvedValue(inventario());
      await expect(
        servicio.obtenerExistencia(4, usuario(RolUsuario.DOCENTE_AGRICOLA)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('listarMovimientos (GET /inventario/existencias/movimientos)', () => {
    it('ordena por fecha e id descendente y sin filtros no agrega condiciones', async () => {
      await servicio.listarMovimientos({ pagina: 1, limite: 10 }, admin);
      expect(movimientos.qb.orderBy).toHaveBeenCalledWith(
        'movimiento.fecha',
        'DESC',
      );
      expect(movimientos.qb.andWhere).not.toHaveBeenCalled();
    });

    it('aplica inventario, rango, tipo', async () => {
      await servicio.listarMovimientos(
        {
          inventarioId: 4,
          desde: '2026-09-01',
          hasta: '2026-09-30',
          tipo: TipoMovimiento.SALIDA,
          pagina: 1,
          limite: 10,
        },
        admin,
      );
      const q = movimientos.qb.andWhere;
      expect(q).toHaveBeenCalledWith(
        'movimiento.inventario_id = :inventarioId',
        { inventarioId: 4 },
      );
      expect(q).toHaveBeenCalledWith('movimiento.fecha >= :desde', {
        desde: '2026-09-01',
      });
      expect(q).toHaveBeenCalledWith('movimiento.fecha <= :hasta', {
        hasta: '2026-09-30',
      });
      expect(q).toHaveBeenCalledWith('movimiento.tipo = :tipo', {
        tipo: 'SALIDA',
      });
    });

    it('docente: solo ve movimientos de su departamento', async () => {
      await servicio.listarMovimientos(
        { pagina: 1, limite: 10 },
        usuario(RolUsuario.DOCENTE_AGRICOLA),
      );
      expect(movimientos.qb.andWhere).toHaveBeenCalledWith(
        'movimiento.departamento_snapshot = :departamentoPermitido',
        {
          departamentoPermitido: Departamento.AGRICOLA,
        },
      );
    });
  });

  describe('registrarEntrada / registrarSalida (POST /inventario/existencias/:id/{entradas,salidas})', () => {
    const entrada = { cantidad: 10, fecha: '2026-09-10', origen: 'Compra' };
    const salida = { cantidad: 4, fecha: '2026-09-10', motivo: 'Consumo' };

    /**
     * Prepara los 4 builders de la transacción en orden: insert de la reserva,
     * lectura de la reserva, inventario y re-lectura del movimiento guardado.
     */
    function armar(opts: { reserva?: unknown; inventario?: unknown } = {}) {
      builders.push(
        crearQueryBuilderSimulado(),
        crearQueryBuilderSimulado({
          getOne:
            'reserva' in opts
              ? opts.reserva
              : { id: 1, huella: 'x', movimientoId: null },
        }),
        crearQueryBuilderSimulado({
          getOne: 'inventario' in opts ? opts.inventario : inventario(),
        }),
        crearQueryBuilderSimulado({
          getOne: {
            id: 11,
            tipo: 'ENTRADA',
            cantidad: 10,
            fecha: '2026-09-10',
            origen: null,
            motivo: null,
            productoNombre: 'Concentrado',
            unidadMedida: 'KG',
            departamento: 'PECUARIO',
            precioUnitario: 1500,
            creadoEn: new Date(),
            inventario: inventario(),
            responsable: { id: 'u-1', nombre: 'A' },
          },
        }),
      );
      // La huella real depende del payload: se hace coincidir con la reserva creada.
      const reserva = builders[1].getOne;
      reserva.mockImplementation(() =>
        Promise.resolve(
          opts.reserva === null
            ? null
            : {
                id: 1,
                huella: huellaEsperada,
                movimientoId: null,
                ...(opts.reserva as object),
              },
        ),
      );
    }
    let huellaEsperada = '';
    beforeEach(() => {
      huellaEsperada = '';
    });

    function huella(
      tipo: TipoMovimiento.ENTRADA | TipoMovimiento.SALIDA,
      dto: typeof entrada | typeof salida,
    ) {
      const { crearHuellaMovimiento } =
        jest.requireActual<typeof import('./stock.service')>('./stock.service');
      return crearHuellaMovimiento(4, tipo, dto);
    }

    it('entrada: suma al saldo, guarda el movimiento con precio y snapshot, y vincula la reserva idempotente', async () => {
      huellaEsperada = huella(TipoMovimiento.ENTRADA, entrada);
      armar();

      const r = await servicio.registrarEntrada(4, entrada, admin, CLAVE);

      expect(manager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tipo: TipoMovimiento.ENTRADA,
          cantidad: 10,
          origen: 'Compra',
          motivo: null,
          productoNombre: 'Concentrado',
          precioUnitario: 1500,
          responsableId: 'u-1',
        }),
      );
      expect(manager.update).toHaveBeenCalledWith(expect.anything(), 1, {
        movimientoId: 11,
      });
      expect(r).toMatchObject({
        id: 11,
        responsable: { id: 'u-1', nombre: 'A' },
      });
      expect(notificaciones.notificarStockBajo).not.toHaveBeenCalled();
    });

    it('salida: guarda el motivo y no el origen', async () => {
      huellaEsperada = huella(TipoMovimiento.SALIDA, salida);
      armar();
      await servicio.registrarSalida(4, salida, admin, CLAVE);
      expect(manager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tipo: 'SALIDA',
          motivo: 'Consumo',
          origen: null,
        }),
      );
    });

    it('misma clave con otro payload: 409 y no registra nada', async () => {
      huellaEsperada = 'otra-huella';
      armar();
      await expect(
        servicio.registrarEntrada(4, entrada, admin, CLAVE),
      ).rejects.toThrow(
        'La clave Idempotency-Key ya fue usada con otra solicitud.',
      );
      expect(manager.update).not.toHaveBeenCalled();
    });

    it('no se pudo reservar la clave: 409', async () => {
      armar({ reserva: null });
      await expect(
        servicio.registrarEntrada(4, entrada, admin, CLAVE),
      ).rejects.toThrow('No se pudo reservar la clave idempotente.');
    });

    it.each([
      ['inventario inexistente', null],
      ['inventario inactivo', inventario({ activo: false })],
      [
        'producto inactivo',
        inventario({
          producto: producto({
            activo: false,
            configuracionStock: { activo: true },
          }),
        }),
      ],
      [
        'configuración inactiva',
        inventario({
          producto: producto({
            configuracionStock: { activo: false, stockMinimo: 1 },
          }),
        }),
      ],
      [
        'sin configuración',
        inventario({ producto: producto({ configuracionStock: null }) }),
      ],
    ])('404: %s', async (_c, inv) => {
      huellaEsperada = huella(TipoMovimiento.ENTRADA, entrada);
      armar({ inventario: inv });
      await expect(
        servicio.registrarEntrada(4, entrada, admin, CLAVE),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('docente de otro departamento: 403', async () => {
      huellaEsperada = huella(TipoMovimiento.ENTRADA, entrada);
      armar();
      await expect(
        servicio.registrarEntrada(
          4,
          entrada,
          usuario(RolUsuario.DOCENTE_AGRICOLA),
          CLAVE,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('docente del mismo departamento: permitido', async () => {
      const docente = usuario(RolUsuario.DOCENTE_PECUARIO);
      const { crearHuellaMovimiento } =
        jest.requireActual<typeof import('./stock.service')>('./stock.service');
      huellaEsperada = crearHuellaMovimiento(
        4,
        TipoMovimiento.ENTRADA,
        entrada,
      );
      armar();
      await expect(
        servicio.registrarEntrada(4, entrada, docente, CLAVE),
      ).resolves.toBeDefined();
    });

    it('cantidad decimal en producto por UNIDAD: 400', async () => {
      const dec = { ...entrada, cantidad: 1.5 };
      huellaEsperada = huella(TipoMovimiento.ENTRADA, dec);
      armar({
        inventario: inventario({
          producto: producto({
            unidadMedida: UnidadMedida.UNIDAD,
            configuracionStock: { stockMinimo: 1, precio: 1, activo: true },
          }),
        }),
      });
      await expect(
        servicio.registrarEntrada(4, dec, admin, CLAVE),
      ).rejects.toThrow(
        'La cantidad debe ser un número entero para productos por unidad.',
      );
    });

    it('salida mayor al saldo: 400 "en negativo"', async () => {
      const grande = { ...salida, cantidad: 25 };
      huellaEsperada = huella(TipoMovimiento.SALIDA, grande);
      armar();
      await expect(
        servicio.registrarSalida(4, grande, admin, CLAVE),
      ).rejects.toThrow('La salida dejaría la existencia en negativo.');
    });

    it('salida exactamente igual al saldo: permitida (queda en cero)', async () => {
      const todo = { ...salida, cantidad: 20 };
      huellaEsperada = huella(TipoMovimiento.SALIDA, todo);
      armar();
      await expect(
        servicio.registrarSalida(4, todo, admin, CLAVE),
      ).resolves.toBeDefined();
    });

    it('entrada que superaría el máximo registrable: 400', async () => {
      huellaEsperada = huella(TipoMovimiento.ENTRADA, entrada);
      armar({ inventario: inventario({ cantidadActual: 9999999999.99 }) });
      await expect(
        servicio.registrarEntrada(4, entrada, admin, CLAVE),
      ).rejects.toThrow('por encima del máximo registrable');
    });

    describe('aviso de stock bajo', () => {
      it('al cruzar el mínimo hacia abajo se notifica a los administradores', async () => {
        const baja = { ...salida, cantidad: 16 }; // 20 -> 4 (<= 5)
        huellaEsperada = huella(TipoMovimiento.SALIDA, baja);
        armar();

        await servicio.registrarSalida(4, baja, admin, CLAVE);

        expect(notificaciones.notificarStockBajo).toHaveBeenCalledWith({
          productoNombre: 'Concentrado',
          unidadMedida: UnidadMedida.Kilogramo,
          cantidadActual: 4,
          stockMinimo: 5,
        });
      });

      it('si ya estaba bajo el mínimo no vuelve a avisar', async () => {
        huellaEsperada = huella(TipoMovimiento.SALIDA, {
          ...salida,
          cantidad: 1,
        });
        armar({ inventario: inventario({ cantidadActual: 4 }) });
        await servicio.registrarSalida(
          4,
          { ...salida, cantidad: 1 },
          admin,
          CLAVE,
        );
        expect(notificaciones.notificarStockBajo).not.toHaveBeenCalled();
      });

      it('una entrada nunca dispara el aviso', async () => {
        huellaEsperada = huella(TipoMovimiento.ENTRADA, entrada);
        armar({ inventario: inventario({ cantidadActual: 1 }) });
        await servicio.registrarEntrada(4, entrada, admin, CLAVE);
        expect(notificaciones.notificarStockBajo).not.toHaveBeenCalled();
      });

      it('si el envío del correo falla, el movimiento igual se registra', async () => {
        const baja = { ...salida, cantidad: 16 };
        huellaEsperada = huella(TipoMovimiento.SALIDA, baja);
        armar();
        notificaciones.notificarStockBajo.mockRejectedValue(
          new Error('SMTP caído'),
        );
        jest
          .spyOn(
            (servicio as unknown as { logger: { error: () => void } }).logger,
            'error',
          )
          .mockImplementation();

        await expect(
          servicio.registrarSalida(4, baja, admin, CLAVE),
        ).resolves.toBeDefined();
      });
    });
  });
});
