/**
 * Pruebas unitarias - DepartamentoService (soporte de /libro-caja/departamentos)
 * Usa la LibroCajaPolicy real: solo ADMINISTRADOR crea, edita o desactiva.
 */
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { crearRepositorioSimulado } from '../../../../test/helpers/typeorm-mocks';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { LibroCajaPolicy } from '../libro-caja.policy';
import { FondoCaja } from '../periodo/entities/fondo-caja.entity';
import { PeriodoCaja } from '../periodo/entities/periodo-caja.entity';
import { EstadoFondo } from '../periodo/enums/estado-fondo.enum';
import { DepartamentoCaja } from './entities/departamento-caja.entity';
import { DepartamentoService } from './departamento.service';

const admin = {
  id: 'a-1',
  correo: 'a@x.cr',
  nombre: 'A',
  rol: RolUsuario.ADMINISTRADOR,
};
const docente = { ...admin, rol: RolUsuario.DOCENTE_AGRICOLA };
const dto = { nombreUnidad: 'Agrícola', tipoActividad: 'Producción' };
const fila = (extra: object = {}) => ({
  id: 2,
  nombreUnidad: 'Agrícola',
  tipoActividad: 'Producción',
  activo: true,
  creadoEn: new Date('2026-01-01'),
  actualizadoEn: new Date('2026-01-02'),
  ...extra,
});

describe('DepartamentoService', () => {
  let repo: ReturnType<typeof crearRepositorioSimulado>;
  let manager: {
    save: jest.Mock;
    create: jest.Mock;
    findOne: jest.Mock;
    count: jest.Mock;
    delete: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  let servicio: DepartamentoService;

  beforeEach(() => {
    repo = crearRepositorioSimulado();
    manager = {
      save: jest.fn((_clase: unknown, e: object) =>
        Promise.resolve({
          id: 2,
          creadoEn: new Date(),
          actualizadoEn: new Date(),
          ...e,
        }),
      ),
      create: jest.fn((_clase: unknown, datos: object) => datos),
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    dataSource = {
      transaction: jest.fn((fn: (m: typeof manager) => unknown) => fn(manager)),
    };
    servicio = new DepartamentoService(
      repo as never,
      dataSource as never,
      new LibroCajaPolicy(),
    );
  });

  describe('listar (GET)', () => {
    it('por defecto solo activos, orden por nombre e id', async () => {
      repo.qb.getManyAndCount.mockResolvedValue([[fila()], 1]);

      const r = await servicio.listar({ pagina: 1, limite: 10 });

      expect(repo.qb.orderBy).toHaveBeenCalledWith(
        'departamento.nombreUnidad',
        'ASC',
      );
      expect(repo.qb.andWhere).toHaveBeenCalledWith(
        'departamento.activo = true',
      );
      expect(r.datos).toHaveLength(1);
      expect(r.meta.total).toBe(1);
    });

    it('activo=false lista solo inactivos', async () => {
      await servicio.listar({ activo: false, pagina: 1, limite: 10 });
      expect(repo.qb.andWhere).toHaveBeenCalledWith(
        'departamento.activo = :activo',
        { activo: false },
      );
    });

    it('filtra por tipo de actividad y búsqueda', async () => {
      await servicio.listar({
        tipoActividad: 'Prod',
        q: 'agr',
        pagina: 1,
        limite: 10,
      });
      expect(repo.qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('tipoActividad'),
        { tipoActividad: '%Prod%' },
      );
      expect(repo.qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('nombreUnidad'),
        { q: '%agr%' },
      );
    });
  });

  describe('obtener (GET :id)', () => {
    it('devuelve el departamento aunque esté inactivo', async () => {
      repo.findOne.mockResolvedValue(fila({ activo: false }));
      expect(await servicio.obtener(2)).toMatchObject({ id: 2, activo: false });
    });

    it('404 si no existe', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(servicio.obtener(2)).rejects.toThrow(
        new NotFoundException('El departamento no existe.'),
      );
    });
  });

  describe('crear (POST)', () => {
    it('crea activo, dentro de una transacción, sin fondo si no hay periodo abierto', async () => {
      repo.qb.getOne.mockResolvedValue(null);

      const r = await servicio.crear(dto, admin);

      expect(manager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ ...dto, activo: true, creadoPor: 'a-1' }),
      );
      expect(manager.save).toHaveBeenCalledTimes(1);
      expect(r).toMatchObject({ nombreUnidad: 'Agrícola', activo: true });
    });

    it('con periodo ABIERTO crea también su fondo PENDIENTE', async () => {
      repo.qb.getOne.mockResolvedValue(null);
      manager.findOne.mockResolvedValue({ id: 10 });

      await servicio.crear(dto, admin);

      expect(manager.save).toHaveBeenCalledTimes(2);
      expect(manager.create).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          periodo: { id: 10 },
          estado: EstadoFondo.PENDIENTE,
          montoSolicitado: null,
        }),
      );
    });

    it('nombre ya usado por un departamento activo (sin importar mayúsculas): 409', async () => {
      repo.qb.getOne.mockResolvedValue(fila());
      await expect(servicio.crear(dto, admin)).rejects.toThrow(
        new ConflictException(
          'Ya existe un departamento activo llamado "Agrícola".',
        ),
      );
      expect(repo.qb.where).toHaveBeenCalledWith(
        expect.stringContaining('lower'),
        { nombre: 'Agrícola' },
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('carrera: violación UNIQUE dentro de la transacción da 409', async () => {
      repo.qb.getOne.mockResolvedValue(null);
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

    it('no administrador: 403 sin consultar nada', async () => {
      await expect(servicio.crear(dto, docente)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('actualizar (PATCH :id)', () => {
    it('actualiza y audita; el chequeo de nombre excluye al propio departamento', async () => {
      repo.findOne.mockResolvedValue(fila());
      repo.qb.getOne.mockResolvedValue(null);

      const r = await servicio.actualizar(
        2,
        { nombreUnidad: 'Pecuario', tipoActividad: 'Cría' },
        admin,
      );

      expect(repo.qb.andWhere).toHaveBeenCalledWith(
        'departamento.id != :idExcluido',
        { idExcluido: 2 },
      );
      expect(r).toMatchObject({
        nombreUnidad: 'Pecuario',
        tipoActividad: 'Cría',
      });
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ actualizadoPor: 'a-1' }),
      );
    });

    it('404 si no existe o está inactivo', async () => {
      repo.findOne.mockResolvedValue(fila({ activo: false }));
      await expect(servicio.actualizar(2, dto, admin)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('nombre duplicado en otro departamento activo: 409', async () => {
      repo.findOne.mockResolvedValue(fila());
      repo.qb.getOne.mockResolvedValue(fila({ id: 3 }));
      await expect(servicio.actualizar(2, dto, admin)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('no administrador: 403', async () => {
      await expect(servicio.actualizar(2, dto, docente)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('desactivar (PATCH :id/desactivar)', () => {
    // La baja se guarda con el manager de la transacción, no con el
    // repositorio: así entra junto con el borrado del fondo o no entra ninguno.
    it('baja lógica con auditoría, dentro de la transacción', async () => {
      repo.findOne.mockResolvedValue(fila());

      const r = await servicio.desactivar(2, admin);

      expect(r.activo).toBe(false);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(manager.save).toHaveBeenCalledWith(
        DepartamentoCaja,
        expect.objectContaining({ activo: false, actualizadoPor: 'a-1' }),
      );
      expect(repo.delete).not.toHaveBeenCalled();
      expect(manager.delete).not.toHaveBeenCalledWith(
        DepartamentoCaja,
        expect.anything(),
      );
    });

    it('quita el fondo del período abierto si no tiene asientos', async () => {
      repo.findOne.mockResolvedValue(fila());
      manager.findOne.mockImplementation((clase: unknown) =>
        Promise.resolve(
          clase === PeriodoCaja
            ? { id: 7 }
            : clase === FondoCaja
              ? { id: 33 }
              : null,
        ),
      );
      manager.count.mockResolvedValue(0);

      await servicio.desactivar(2, admin);

      expect(manager.delete).toHaveBeenCalledWith(FondoCaja, 33);
    });

    it('conserva el fondo si ya tiene asientos registrados', async () => {
      repo.findOne.mockResolvedValue(fila());
      manager.findOne.mockImplementation((clase: unknown) =>
        Promise.resolve(
          clase === PeriodoCaja
            ? { id: 7 }
            : clase === FondoCaja
              ? { id: 33 }
              : null,
        ),
      );
      manager.count.mockResolvedValue(4);

      await servicio.desactivar(2, admin);

      expect(manager.delete).not.toHaveBeenCalled();
    });

    it('404 si no existe o ya está inactivo', async () => {
      repo.findOne.mockResolvedValue(fila({ activo: false }));
      await expect(servicio.desactivar(2, admin)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('no administrador: 403', async () => {
      await expect(servicio.desactivar(2, docente)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
