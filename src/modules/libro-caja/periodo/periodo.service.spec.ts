import { BadRequestException, ConflictException } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { DepartamentoCaja } from '../departamento/entities/departamento-caja.entity';
import { LibroCajaPolicy } from '../libro-caja.policy';
import { FondoCaja } from './entities/fondo-caja.entity';
import { EstadoFondo } from './enums/estado-fondo.enum';
import { EstadoPeriodo } from './enums/estado-periodo.enum';
import { PeriodoService } from './periodo.service';

describe('PeriodoService', () => {
  const actor: UsuarioAutenticado = {
    id: 'b62082bb-17b7-49c1-994b-538d77bc814a',
    correo: 'admin@ctp.test',
    nombre: 'Admin',
    rol: RolUsuario.ADMINISTRADOR,
  };
  const policy = new LibroCajaPolicy();
  const departamentos = [
    {
      id: 1,
      nombreUnidad: 'Unidad Agrícola',
      tipoActividad: 'Producción agrícola',
      activo: true,
    },
    {
      id: 2,
      nombreUnidad: 'Unidad Pecuaria',
      tipoActividad: 'Producción pecuaria',
      activo: true,
    },
  ];

  it('al abrir un periodo registra el fondo de cada departamento activo', async () => {
    const fondosGuardados: unknown[] = [];
    const manager = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue(departamentos),
      create: jest.fn((_entidad: unknown, valor: object) => valor),
      save: jest.fn((_entidad: unknown, valor: unknown) => {
        if (Array.isArray(valor)) {
          const conId = valor.map((item, indice) => ({
            id: indice + 1,
            ...(item as object),
          estado: (item as { estado?: string }).estado ?? EstadoFondo.SOLICITADO,
          montoSolicitado:
            (item as { montoSolicitado?: number | null }).montoSolicitado ??
            null,
            creadoEn: new Date(),
            actualizadoEn: new Date(),
            solicitadoEn: null,
            departamento: (item as { departamento: object }).departamento,
          }));
          fondosGuardados.push(...conId);
          return Promise.resolve(conId);
        }
        return Promise.resolve({
          id: 10,
          ...(valor as object),
          estado: EstadoPeriodo.ABIERTO,
          creadoEn: new Date(),
          actualizadoEn: new Date(),
        });
      }),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      }),
    };
    const service = crearServicio({
      transaction: jest.fn((operacion: (m: EntityManager) => unknown) =>
        operacion(manager as unknown as EntityManager),
      ),
    });

    const resultado = await service.abrir(
      {
        nombre: 'I semestre 2026',
        fechaInicio: '2026-02-01',
        fechaFin: '2026-07-31',
        fondos: [
          { departamentoId: 1, monto: 0 },
          { departamentoId: 2, monto: 1500 },
        ],
      },
      actor,
    );

    expect(resultado.fondos).toHaveLength(2);
    expect(
      resultado.fondos.map((fondo) => fondo.departamento.nombreUnidad),
    ).toEqual(['Unidad Agrícola', 'Unidad Pecuaria']);
    expect(fondosGuardados).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          montoSolicitado: 0,
          estado: EstadoFondo.SOLICITADO,
        }),
        expect.objectContaining({
          montoSolicitado: 1500,
          estado: EstadoFondo.SOLICITADO,
        }),
      ]),
    );
  });

  it('no abre un periodo si no hay departamentos activos', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      }),
    };
    const service = crearServicio({
      transaction: jest.fn((operacion: (m: EntityManager) => unknown) =>
        operacion(manager as unknown as EntityManager),
      ),
    });

    await expect(
      service.abrir(
        {
          nombre: 'I semestre 2026',
          fechaInicio: '2026-02-01',
          fechaFin: '2026-07-31',
          fondos: [
            { departamentoId: 1, monto: 0 },
            { departamentoId: 2, monto: 1500 },
          ],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('al consultar un periodo abierto agrega los departamentos activos que faltan', async () => {
    const ahora = new Date('2026-09-04T18:54:31.000Z');
    const agricola = {
      id: 1,
      nombreUnidad: 'Agricola',
      tipoActividad: 'Produccion agricola',
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    const gallina = {
      id: 3,
      nombreUnidad: 'Gallina',
      tipoActividad: 'Pro Pecuaria',
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    const periodo = {
      id: 4,
      nombre: 'I Periodo 2026',
      fechaInicio: '2026-09-04',
      fechaFin: '2026-12-17',
      estado: EstadoPeriodo.ABIERTO,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    const fondoAgricola = {
      id: 9,
      montoSolicitado: 100000,
      estado: EstadoFondo.SOLICITADO,
      solicitadoEn: ahora,
      pieInforme: null,
      creadoEn: ahora,
      actualizadoEn: ahora,
      departamento: agricola,
    };
    const fondoGallina = {
      ...fondoAgricola,
      id: 10,
      montoSolicitado: null,
      estado: EstadoFondo.PENDIENTE,
      solicitadoEn: null,
      departamento: gallina,
    };
    const guardados: Array<{ departamento: { id: number } }> = [];
    const manager = {
      find: jest.fn((entidad: unknown) => {
        if (entidad === DepartamentoCaja) {
          return Promise.resolve([agricola, gallina]);
        }
        if (entidad === FondoCaja) {
          return Promise.resolve([fondoAgricola]);
        }
        return Promise.resolve([]);
      }),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ departamentoId: 1 }]),
      }),
      create: jest.fn((_entidad: unknown, valor: object) => valor),
      save: jest.fn(
        (_entidad: unknown, valor: { departamento: { id: number } }) => {
          guardados.push(valor);
          return Promise.resolve(valor);
        },
      ),
    };
    const periodosRepo = {
      findOne: jest.fn().mockResolvedValue(periodo),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          ...periodo,
          fondos: [fondoAgricola, fondoGallina],
        }),
      }),
    };
    const service = new PeriodoService(
      periodosRepo as never,
      {
        transaction: jest.fn((operacion: (m: EntityManager) => unknown) =>
          operacion(manager as unknown as EntityManager),
        ),
      } as DataSource,
      policy,
    );

    const resultado = await service.obtener(4);

    expect(guardados.map((fondo) => fondo.departamento.id)).toEqual([3]);
    expect(guardados[0]).toEqual(
      expect.objectContaining({
        estado: EstadoFondo.PENDIENTE,
        montoSolicitado: null,
      }),
    );
    expect(resultado.fondos.map((fondo) => fondo.departamento.nombreUnidad)).toEqual([
      'Agricola',
      'Gallina',
    ]);
  });

  it('al consultar un periodo abierto quita un departamento inactivo sin asientos', async () => {
    const ahora = new Date('2026-09-04T18:54:31.000Z');
    const agricola = {
      id: 1,
      nombreUnidad: 'Agricola',
      tipoActividad: 'Produccion agricola',
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    const gallina = {
      id: 3,
      nombreUnidad: 'Gallina',
      tipoActividad: 'Pro Pecuaria',
      activo: false,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    const periodo = {
      id: 4,
      nombre: 'I Periodo 2026',
      fechaInicio: '2026-09-04',
      fechaFin: '2026-12-17',
      estado: EstadoPeriodo.ABIERTO,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };
    const fondoGallina = {
      id: 10,
      montoSolicitado: null,
      estado: EstadoFondo.PENDIENTE,
      solicitadoEn: null,
      pieInforme: null,
      creadoEn: ahora,
      actualizadoEn: ahora,
      departamento: gallina,
    };
    const eliminados: number[] = [];
    const manager = {
      find: jest.fn((entidad: unknown) => {
        if (entidad === DepartamentoCaja) return Promise.resolve([agricola]);
        if (entidad === FondoCaja) return Promise.resolve([fondoGallina]);
        return Promise.resolve([]);
      }),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      }),
      count: jest.fn().mockResolvedValue(0),
      delete: jest.fn((_entidad: unknown, id: number) => {
        eliminados.push(id);
        return Promise.resolve({ affected: 1 });
      }),
      create: jest.fn((_entidad: unknown, valor: object) => valor),
      save: jest.fn((_entidad: unknown, valor: unknown) => Promise.resolve(valor)),
    };
    const periodosRepo = {
      findOne: jest.fn().mockResolvedValue(periodo),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ ...periodo, fondos: [] }),
      }),
    };
    const service = new PeriodoService(
      periodosRepo as never,
      {
        transaction: jest.fn((operacion: (m: EntityManager) => unknown) =>
          operacion(manager as unknown as EntityManager),
        ),
      } as DataSource,
      policy,
    );

    const resultado = await service.obtener(4);

    expect(eliminados).toEqual([10]);
    expect(resultado.fondos).toEqual([]);
  });

  it('no abre un periodo si ya hay otro abierto', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        nombre: 'Periodo anterior',
        estado: EstadoPeriodo.ABIERTO,
      }),
    };
    const service = crearServicio({
      transaction: jest.fn((operacion: (m: EntityManager) => unknown) =>
        operacion(manager as unknown as EntityManager),
      ),
    });

    await expect(
      service.abrir(
        {
          nombre: 'I semestre 2026',
          fechaInicio: '2026-02-01',
          fechaFin: '2026-07-31',
          fondos: [
            { departamentoId: 1, monto: 0 },
            { departamentoId: 2, monto: 1500 },
          ],
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  function crearServicio(dataSource: {
    transaction: DataSource['transaction'];
  }): PeriodoService {
    return new PeriodoService(
      {
        createQueryBuilder: jest.fn(),
      } as never,
      dataSource as DataSource,
      policy,
    );
  }
});
