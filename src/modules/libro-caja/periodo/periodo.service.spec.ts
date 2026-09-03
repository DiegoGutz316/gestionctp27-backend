import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { LibroCajaPolicy } from '../libro-caja.policy';
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

  it('al abrir un periodo carga un fondo pendiente por cada departamento activo', async () => {
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
            estado: EstadoFondo.PENDIENTE,
            montoSolicitado: null,
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
      },
      actor,
    );

    expect(resultado.fondos).toHaveLength(2);
    expect(resultado.fondos.map((fondo) => fondo.departamento.nombreUnidad)).toEqual(
      ['Unidad Agrícola', 'Unidad Pecuaria'],
    );
    expect(fondosGuardados).toHaveLength(2);
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
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
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
