import { createHash } from 'crypto';
import { BadRequestException, ConflictException } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { LibroCajaPolicy } from '../libro-caja.policy';
import {
  AsientoService,
  MENSAJE_CLAVE_ANULADA,
  MENSAJE_CLAVE_OTRA_SOLICITUD,
} from './asiento.service';
import { AsientoCaja } from './entities/asiento-caja.entity';
import { IdempotenciaAsiento } from './entities/idempotencia-asiento.entity';
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

  function huellaDe(cuerpo: typeof dto): string {
    return createHash('sha256')
      .update(
        JSON.stringify({
          periodoId: 1,
          fondoId: 5,
          fecha: cuerpo.fecha,
          numeroFactura: cuerpo.numeroFactura,
          descripcion: cuerpo.descripcion,
          ingresos: cuerpo.ingresos,
          egresos: cuerpo.egresos,
        }),
      )
      .digest('hex');
  }

  it('numera el asiento en secuencia por departamento', async () => {
    const guardados: Array<{ numero?: number }> = [];
    const manager = {
      findOne: jest.fn((entidad: unknown) => {
        if (entidad === IdempotenciaAsiento) return Promise.resolve(null);
        return Promise.resolve(fondoAbierto);
      }),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((_entidad: unknown, valor: object) => valor),
      save: jest.fn(
        (
          _entidad: unknown,
          valor: { numero?: number } | { numero?: number }[],
        ) => {
          if (Array.isArray(valor)) {
            guardados.push(...valor);
            return Promise.resolve(
              valor.map((item, indice) => ({ id: indice + 1, ...item })),
            );
          }
          return Promise.resolve({ id: 9, ...valor });
        },
      ),
    };
    const service = crearServicio(manager);

    await service.crear(1, 5, dto, actor, CLAVE);

    expect(guardados.some((asiento) => asiento.numero === 1)).toBe(true);
  });

  it('no registra asientos si el periodo está cerrado', async () => {
    const manager = {
      findOne: jest.fn((entidad: unknown) => {
        if (entidad === IdempotenciaAsiento) return Promise.resolve(null);
        return Promise.resolve({
          ...fondoAbierto,
          periodo: { ...fondoAbierto.periodo, estado: EstadoPeriodo.CERRADO },
        });
      }),
    };
    const service = crearServicio(manager);

    await expect(service.crear(1, 5, dto, actor, CLAVE)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rechaza un egreso que deja el saldo en negativo', async () => {
    const manager = {
      findOne: jest.fn((entidad: unknown) => {
        if (entidad === IdempotenciaAsiento) return Promise.resolve(null);
        return Promise.resolve({
          ...fondoAbierto,
          montoSolicitado: 0,
        });
      }),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((_entidad: unknown, valor: object) => valor),
    };
    const service = crearServicio(manager);

    await expect(
      service.crear(1, 5, { ...dto, ingresos: 0, egresos: 10 }, actor, CLAVE),
    ).rejects.toThrow('Ese egreso deja el saldo del libro en negativo');
  });

  it('rechaza una fecha fuera del periodo', async () => {
    const manager = {
      findOne: jest.fn((entidad: unknown) => {
        if (entidad === IdempotenciaAsiento) return Promise.resolve(null);
        return Promise.resolve(fondoAbierto);
      }),
    };
    const service = crearServicio(manager);

    await expect(
      service.crear(1, 5, { ...dto, fecha: '2025-12-01' }, actor, CLAVE),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reutiliza la clave solo si el asiento sigue en el libro', async () => {
    const manager = {
      findOne: jest.fn((entidad: unknown) => {
        if (entidad === IdempotenciaAsiento) {
          return Promise.resolve({
            responsableId: actor.id,
            clave: CLAVE,
            huella: huellaDe(dto),
            asientoId: 4,
          });
        }
        if (entidad === AsientoCaja) return Promise.resolve({ id: 4 });
        return Promise.resolve(fondoAbierto);
      }),
    };
    const listar = jest.fn().mockResolvedValue({ asientos: [{ id: 4 }] });
    const service = crearServicio(manager);
    (service as unknown as { listar: typeof listar }).listar = listar;

    await service.crear(1, 5, dto, actor, CLAVE);
    expect(listar).toHaveBeenCalledWith(1, 5);
  });

  it('no finge un alta si la clave quedó con asiento_id nulo', async () => {
    const manager = {
      findOne: jest.fn((entidad: unknown) => {
        if (entidad === IdempotenciaAsiento) {
          return Promise.resolve({
            responsableId: actor.id,
            clave: CLAVE,
            huella: huellaDe(dto),
            asientoId: null,
          });
        }
        return Promise.resolve(fondoAbierto);
      }),
    };
    const service = crearServicio(manager);

    await expect(service.crear(1, 5, dto, actor, CLAVE)).rejects.toThrow(
      MENSAJE_CLAVE_ANULADA,
    );
  });

  it('no finge un alta si la clave apunta a un asiento anulado', async () => {
    const manager = {
      findOne: jest.fn((entidad: unknown) => {
        if (entidad === IdempotenciaAsiento) {
          return Promise.resolve({
            responsableId: actor.id,
            clave: CLAVE,
            huella: huellaDe(dto),
            asientoId: 15,
          });
        }
        if (entidad === AsientoCaja) return Promise.resolve(null);
        return Promise.resolve(fondoAbierto);
      }),
    };
    const service = crearServicio(manager);

    await expect(service.crear(1, 5, dto, actor, CLAVE)).rejects.toThrow(
      MENSAJE_CLAVE_ANULADA,
    );
  });

  it('rechaza la misma clave con otro cuerpo', async () => {
    const manager = {
      findOne: jest.fn((entidad: unknown) => {
        if (entidad === IdempotenciaAsiento) {
          return Promise.resolve({
            responsableId: actor.id,
            clave: CLAVE,
            huella: 'a'.repeat(64),
            asientoId: 4,
          });
        }
        return Promise.resolve(fondoAbierto);
      }),
    };
    const service = crearServicio(manager);

    await expect(service.crear(1, 5, dto, actor, CLAVE)).rejects.toThrow(
      MENSAJE_CLAVE_OTRA_SOLICITUD,
    );
  });

  it('conserva la clave y suelta el asiento al anular', async () => {
    const asiento = {
      id: 4,
      fecha: '2026-03-12',
      descripcion: 'Venta',
      ingresos: 10,
      egresos: 0,
    };
    const execute = jest.fn().mockResolvedValue({ affected: 1 });
    const where = jest.fn().mockReturnValue({ execute });
    const set = jest.fn().mockReturnValue({ where });
    const update = jest.fn().mockReturnValue({ set });
    const deleted: unknown[] = [];
    const manager = {
      findOne: jest.fn().mockResolvedValue(fondoAbierto),
      find: jest.fn().mockResolvedValue([asiento]),
      createQueryBuilder: jest.fn().mockReturnValue({ update }),
      delete: jest.fn((entidad: unknown, criterio: unknown) => {
        deleted.push([entidad, criterio]);
        return Promise.resolve({ affected: 1 });
      }),
      save: jest.fn((_entidad: unknown, valor: unknown) =>
        Promise.resolve(valor),
      ),
    };
    const service = crearServicio(manager, {
      find: jest.fn().mockResolvedValue([]),
    });

    await service.eliminar(1, 5, 4, actor);

    expect(update).toHaveBeenCalledWith(IdempotenciaAsiento);
    expect(set).toHaveBeenCalledWith({ asientoId: null });
    expect(deleted).toEqual([[AsientoCaja, 4]]);
  });

  function crearServicio(
    manager: object,
    asientosRepo?: object,
  ): AsientoService {
    return new AsientoService(
      {
        findOne: jest.fn().mockResolvedValue(fondoAbierto),
      } as never,
      (asientosRepo ?? {
        find: jest.fn().mockResolvedValue([]),
        manager,
      }) as never,
      {
        findOne: jest.fn().mockResolvedValue(null),
      } as never,
      {
        transaction: jest.fn((operacion: (m: EntityManager) => unknown) =>
          operacion(manager as EntityManager),
        ),
      } as unknown as DataSource,
      policy,
    );
  }
});
