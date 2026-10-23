import { BadRequestException, ConflictException } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { LibroCajaPolicy } from '../libro-caja.policy';
import { AsientoService } from './asiento.service';
import { EstadoFondo } from './enums/estado-fondo.enum';
import { EstadoPeriodo } from './enums/estado-periodo.enum';

describe('AsientoService', () => {
  const actor: UsuarioAutenticado = {
    id: 'b62082bb-17b7-49c1-994b-538d77bc814a',
    correo: 'admin@ctp.test',
    nombre: 'Admin',
    rol: RolUsuario.ADMINISTRADOR,
  };
  const policy = new LibroCajaPolicy();
  const ahora = new Date('2026-03-12T12:00:00.000Z');
  const fondoAbierto = {
    id: 5,
    montoSolicitado: 100,
    estado: EstadoFondo.SOLICITADO,
    solicitadoEn: ahora,
    creadoEn: ahora,
    actualizadoEn: ahora,
    departamento: {
      id: 2,
      nombreUnidad: 'Unidad Pecuaria',
      tipoActividad: 'Producción pecuaria',
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
    periodo: {
      id: 1,
      nombre: 'II semestre 2026',
      fechaInicio: '2026-02-01',
      fechaFin: '2026-07-31',
      estado: EstadoPeriodo.ABIERTO,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
  };

  const dto = {
    fecha: '2026-03-12',
    numeroFactura: '7974975',
    descripcion: 'Venta de carne en canal',
    ingresos: 50,
    egresos: 0,
  };
  const CLAVE = '11111111-1111-4111-8111-111111111111';

  it('numera el asiento en secuencia por departamento', async () => {
    const guardados: Array<{ numero?: number }> = [];
    const manager = {
      findOne: jest.fn().mockResolvedValue(fondoAbierto),
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ ultimo: '3' }),
      }),
      create: jest.fn((_entidad: unknown, valor: object) => valor),
      save: jest.fn((_entidad: unknown, valor: { numero?: number } | { numero?: number }[]) => {
        if (Array.isArray(valor)) {
          guardados.push(...valor);
          return Promise.resolve(
            valor.map((item, indice) => ({ id: indice + 1, ...item })),
          );
        }
        return Promise.resolve({ id: 9, ...valor });
      }),
    };
    const service = crearServicio(manager);

    await service.crear(1, 5, dto, actor, CLAVE);

    expect(guardados.some((asiento) => asiento.numero === 1)).toBe(true);
  });

  it('no registra asientos si el periodo está cerrado', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue({
        ...fondoAbierto,
        periodo: { ...fondoAbierto.periodo, estado: EstadoPeriodo.CERRADO },
      }),
    };
    const service = crearServicio(manager);

    await expect(
      service.crear(1, 5, dto, actor, CLAVE),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza un egreso que deja el saldo en negativo', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue({
        ...fondoAbierto,
        montoSolicitado: 0,
      }),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((_entidad: unknown, valor: object) => valor),
    };
    const service = crearServicio(manager);

    await expect(
      service.crear(
        1,
        5,
        { ...dto, ingresos: 0, egresos: 10 },
        actor,
        CLAVE,
      ),
    ).rejects.toThrow('Ese egreso deja el saldo del libro en negativo');
  });

  it('rechaza una fecha fuera del periodo', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue(fondoAbierto),
    };
    const service = crearServicio(manager);

    await expect(
      service.crear(1, 5, { ...dto, fecha: '2025-12-01' }, actor, CLAVE),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  function crearServicio(manager: object): AsientoService {
    return new AsientoService(
      {
        findOne: jest.fn().mockResolvedValue(fondoAbierto),
      } as never,
      {
        find: jest.fn().mockResolvedValue([]),
      } as never,
      {
        findOne: jest.fn().mockResolvedValue(null),
      } as never,
      {
        transaction: jest.fn((operacion: (m: EntityManager) => unknown) =>
          operacion(manager as EntityManager),
        ),
      } as DataSource,
      policy,
    );
  }
});
