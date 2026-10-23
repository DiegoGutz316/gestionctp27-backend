/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas unitarias - AsientoService: endpoints de
 * /libro-caja/periodos/:periodoId/fondos/:fondoId/asientos no cubiertos por
 * asiento.service.spec.ts (listar, actualizar, eliminar, permisos y estados
 * del libro). Usa la LibroCajaPolicy real.
 */
import { createHash } from 'crypto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import {
  crearQueryBuilderSimulado,
  crearRepositorioSimulado,
} from '../../../../test/helpers/typeorm-mocks';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { LibroCajaPolicy } from '../libro-caja.policy';
import { AsientoService } from './asiento.service';
import { AsientoCaja } from './entities/asiento-caja.entity';
import { IdempotenciaAsiento } from './entities/idempotencia-asiento.entity';
import { EstadoFondo } from './enums/estado-fondo.enum';
import { EstadoPeriodo } from './enums/estado-periodo.enum';

const usuario = (rol: RolUsuario) => ({
  id: 'u-1',
  correo: 'a@x.cr',
  nombre: 'A',
  rol,
});
const admin = usuario(RolUsuario.ADMINISTRADOR);
const ahora = new Date('2026-03-12T12:00:00.000Z');
const CLAVE = '11111111-1111-4111-8111-111111111111';

const fondo = (
  extra: Record<string, unknown> = {},
  periodo: Record<string, unknown> = {},
) => ({
  id: 5,
  montoSolicitado: 100,
  estado: EstadoFondo.SOLICITADO,
  solicitadoEn: ahora,
  pieInforme: null,
  creadoEn: ahora,
  actualizadoEn: ahora,
  departamento: {
    id: 2,
    nombreUnidad: 'Pecuaria',
    tipoActividad: 'P',
    activo: true,
    creadoEn: ahora,
    actualizadoEn: ahora,
  },
  periodo: {
    id: 1,
    nombre: 'P',
    fechaInicio: '2026-02-01',
    fechaFin: '2026-07-31',
    estado: EstadoPeriodo.ABIERTO,
    creadoEn: ahora,
    actualizadoEn: ahora,
    ...periodo,
  },
  ...extra,
});
const asiento = (
  id: number,
  fecha: string,
  ingresos: number,
  egresos: number,
  numero = id,
) => ({
  id,
  numero,
  fecha,
  numeroFactura: '',
  descripcion: `a${id}`,
  ingresos,
  egresos,
  creadoEn: ahora,
  actualizadoEn: ahora,
});
const dto = {
  fecha: '2026-03-12',
  numeroFactura: 'F1',
  descripcion: 'Venta',
  ingresos: 50,
  egresos: 0,
};

describe('AsientoService - endpoints', () => {
  let fondos: ReturnType<typeof crearRepositorioSimulado>;
  let asientos: ReturnType<typeof crearRepositorioSimulado>;
  let idem: ReturnType<typeof crearRepositorioSimulado>;
  let manager: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let servicio: AsientoService;

  beforeEach(() => {
    fondos = crearRepositorioSimulado();
    asientos = crearRepositorioSimulado();
    idem = crearRepositorioSimulado();
    Object.assign(asientos, { manager: { findOne: jest.fn() } });
    manager = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((_c: unknown, d: object) => d),
      save: jest.fn((_c: unknown, valor: unknown) =>
        Promise.resolve(
          Array.isArray(valor)
            ? valor.map((v, i) => ({ id: v.id ?? 100 + i, ...v }))
            : valor,
        ),
      ),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => crearQueryBuilderSimulado()),
    };
    const dataSource = {
      transaction: jest.fn((fn: (m: typeof manager) => unknown) => fn(manager)),
    };
    servicio = new AsientoService(
      fondos as never,
      asientos as never,
      idem as never,
      dataSource as never,
      new LibroCajaPolicy(),
    );
  });

  describe('listar (GET)', () => {
    it('devuelve el libro con saldo acumulado y totales', async () => {
      fondos.findOne.mockResolvedValue(fondo());
      asientos.find.mockResolvedValue([
        asiento(1, '2026-03-01', 50, 0),
        asiento(2, '2026-03-02', 0, 30),
      ]);

      const r = await servicio.listar(1, 5);

      expect(asientos.find).toHaveBeenCalledWith({
        where: { fondo: { id: 5 } },
        order: { fecha: 'ASC', numero: 'ASC', id: 'ASC' },
      });
      expect(r.fondoInicial).toBe(100);
      expect(r.asientos.map((a) => a.saldo)).toEqual([150, 120]);
      expect(r.totales).toEqual({ ingresos: 50, egresos: 30, saldo: 120 });
    });

    it('404 si el fondo no existe', async () => {
      fondos.findOne.mockResolvedValue(null);
      await expect(servicio.listar(1, 5)).rejects.toThrow(
        new NotFoundException('El fondo de caja no existe en este periodo.'),
      );
    });

    it('404 si el fondo pertenece a otro periodo (no filtra datos entre periodos)', async () => {
      fondos.findOne.mockResolvedValue(fondo({}, { id: 9 }));
      await expect(servicio.listar(1, 5)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(asientos.find).not.toHaveBeenCalled();
    });
  });

  describe('permisos de escritura (crear / actualizar / eliminar)', () => {
    it.each([RolUsuario.DIRECTORA, RolUsuario.ESTUDIANTE])(
      '%s: 403 en las tres operaciones, sin abrir transacción',
      async (rol) => {
        await expect(
          servicio.crear(1, 5, dto, usuario(rol), CLAVE),
        ).rejects.toBeInstanceOf(ForbiddenException);
        await expect(
          servicio.actualizar(1, 5, 9, dto, usuario(rol)),
        ).rejects.toBeInstanceOf(ForbiddenException);
        await expect(
          servicio.eliminar(1, 5, 9, usuario(rol)),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(manager.findOne).not.toHaveBeenCalled();
      },
    );
  });

  describe('estado del libro', () => {
    it('fondo sin solicitar (PENDIENTE): 409 al crear', async () => {
      manager.findOne.mockImplementation((e: unknown) =>
        Promise.resolve(
          e === IdempotenciaAsiento
            ? null
            : fondo({ estado: EstadoFondo.PENDIENTE }),
        ),
      );
      await expect(servicio.crear(1, 5, dto, admin, CLAVE)).rejects.toThrow(
        'Registre el fondo inicial',
      );
    });

    it('fondo de otro periodo: 404 al crear', async () => {
      manager.findOne.mockImplementation((e: unknown) =>
        Promise.resolve(
          e === IdempotenciaAsiento ? null : fondo({}, { id: 9 }),
        ),
      );
      await expect(
        servicio.crear(1, 5, dto, admin, CLAVE),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('periodo cerrado: 409 al actualizar y al eliminar', async () => {
      manager.findOne.mockResolvedValue(
        fondo({}, { estado: EstadoPeriodo.CERRADO }),
      );
      await expect(servicio.actualizar(1, 5, 9, dto, admin)).rejects.toThrow(
        'periodo cerrado',
      );
      await expect(servicio.eliminar(1, 5, 9, admin)).rejects.toThrow(
        'periodo cerrado',
      );
    });
  });

  describe('crear (POST): casos adicionales', () => {
    it('carrera de la misma clave (UNIQUE): devuelve el libro si la huella coincide y el asiento sigue vivo', async () => {
      const huella = createHash('sha256')
        .update(
          JSON.stringify({
            periodoId: 1,
            fondoId: 5,
            fecha: dto.fecha,
            numeroFactura: 'F1',
            descripcion: 'Venta',
            ingresos: 50,
            egresos: 0,
          }),
        )
        .digest('hex');
      manager.findOne.mockImplementation((e: unknown) =>
        Promise.resolve(e === IdempotenciaAsiento ? null : fondo()),
      );
      manager.save.mockRejectedValueOnce(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('dup'), {
            code: '23505',
            constraint: 'uq_idempotencia_asiento_responsable_clave',
          }),
        ),
      );
      idem.findOne.mockResolvedValue({ huella, asientoId: 3 });
      (
        asientos as unknown as { manager: { findOne: jest.Mock } }
      ).manager.findOne.mockResolvedValue({ id: 3 });
      fondos.findOne.mockResolvedValue(fondo());
      asientos.find.mockResolvedValue([]);

      await expect(
        servicio.crear(1, 5, dto, admin, CLAVE),
      ).resolves.toMatchObject({ fondoInicial: 100 });
    });

    it('un error cualquiera de BD se propaga', async () => {
      const fallo = new Error('caída');
      manager.findOne.mockRejectedValue(fallo);
      await expect(servicio.crear(1, 5, dto, admin, CLAVE)).rejects.toBe(fallo);
    });
  });

  describe('actualizar (PATCH :asientoId)', () => {
    it('corrige el asiento, renumera en orden cronológico y devuelve el libro', async () => {
      const actual = asiento(9, '2026-03-05', 50, 0);
      manager.findOne.mockResolvedValue(fondo());
      manager.find.mockResolvedValue([
        actual,
        asiento(10, '2026-03-10', 0, 20),
      ]);
      fondos.findOne.mockResolvedValue(fondo());
      asientos.find.mockResolvedValue([]);

      await servicio.actualizar(
        1,
        5,
        9,
        { ...dto, fecha: '2026-03-01', ingresos: 70, descripcion: 'Corregido' },
        admin,
      );

      expect(actual).toMatchObject({
        fecha: '2026-03-01',
        ingresos: 70,
        descripcion: 'Corregido',
        numeroFactura: 'F1',
      });
      // 1) numeración temporal (evita choques de UNIQUE), 2) numeración final consecutiva.
      const guardados = manager.save.mock.calls.map(
        (c) => c[1] as Array<{ id: number; numero: number }>,
      );
      expect(guardados[0].every((a) => a.numero > 1_000_000)).toBe(true);
      expect(guardados[1].map((a) => [a.id, a.numero])).toEqual([
        [9, 1],
        [10, 2],
      ]);
    });

    it('404 si el asiento no está en este libro', async () => {
      manager.findOne.mockResolvedValue(fondo());
      manager.find.mockResolvedValue([asiento(10, '2026-03-10', 10, 0)]);
      await expect(servicio.actualizar(1, 5, 9, dto, admin)).rejects.toThrow(
        'El asiento no existe en este libro.',
      );
    });

    it('400 si la fecha queda fuera del periodo', async () => {
      manager.findOne.mockResolvedValue(fondo());
      await expect(
        servicio.actualizar(1, 5, 9, { ...dto, fecha: '2027-01-01' }, admin),
      ).rejects.toThrow(
        'La fecha del asiento debe estar entre 2026-02-01 y 2026-07-31.',
      );
    });

    it('400 si la corrección deja el saldo en negativo', async () => {
      manager.findOne.mockResolvedValue(fondo({ montoSolicitado: 0 }));
      manager.find.mockResolvedValue([asiento(9, '2026-03-05', 50, 0)]);
      await expect(
        servicio.actualizar(
          1,
          5,
          9,
          { ...dto, ingresos: 0, egresos: 10 },
          admin,
        ),
      ).rejects.toThrow('Esa corrección deja el saldo del libro en negativo.');
      expect(manager.save).not.toHaveBeenCalled();
    });
  });

  describe('eliminar (DELETE :asientoId)', () => {
    it('anula el asiento, suelta su clave idempotente y renumera el resto', async () => {
      const qb = crearQueryBuilderSimulado();
      manager.createQueryBuilder.mockReturnValue(qb);
      manager.findOne.mockResolvedValue(fondo());
      manager.find.mockResolvedValue([
        asiento(9, '2026-03-05', 50, 0),
        asiento(10, '2026-03-10', 0, 20),
      ]);
      fondos.findOne.mockResolvedValue(fondo());
      asientos.find.mockResolvedValue([]);

      await servicio.eliminar(1, 5, 9, admin);

      expect(qb.set).toHaveBeenCalledWith({ asientoId: null });
      expect(qb.where).toHaveBeenCalledWith('asiento_id = :id', { id: 9 });
      expect(manager.delete).toHaveBeenCalledWith(AsientoCaja, 9);
      const renumerados = manager.save.mock.calls.at(-1)?.[1] as Array<{
        id: number;
        numero: number;
      }>;
      expect(renumerados.map((a) => [a.id, a.numero])).toEqual([[10, 1]]);
    });

    it('404 si el asiento no existe en el libro (no borra nada)', async () => {
      manager.findOne.mockResolvedValue(fondo());
      manager.find.mockResolvedValue([]);
      await expect(servicio.eliminar(1, 5, 9, admin)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(manager.delete).not.toHaveBeenCalled();
    });

    it('400 si anularlo deja el saldo en negativo (p. ej. un ingreso ya gastado)', async () => {
      manager.findOne.mockResolvedValue(fondo({ montoSolicitado: 0 }));
      manager.find.mockResolvedValue([
        asiento(9, '2026-03-05', 50, 0),
        asiento(10, '2026-03-10', 0, 40),
      ]);
      await expect(servicio.eliminar(1, 5, 9, admin)).rejects.toThrow(
        'Anular ese asiento deja el saldo del libro en negativo.',
      );
    });

    it('anular el único asiento no intenta guardar una lista vacía', async () => {
      manager.findOne.mockResolvedValue(fondo());
      manager.find.mockResolvedValue([asiento(9, '2026-03-05', 50, 0)]);
      fondos.findOne.mockResolvedValue(fondo());
      asientos.find.mockResolvedValue([]);
      await servicio.eliminar(1, 5, 9, admin);
      expect(manager.save).not.toHaveBeenCalled();
    });
  });
});
