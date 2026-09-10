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

  it('numera el asiento en secuencia por departamento', async () => {
    const guardados: Array<{ numero: number }> = [];
    const manager = {
      findOne: jest.fn().mockResolvedValue(fondoAbierto),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ ultimo: '3' }),
      }),
      create: jest.fn((_entidad: unknown, valor: object) => valor),
      save: jest.fn((_entidad: unknown, valor: { numero: number }) => {
        guardados.push(valor);
        return Promise.resolve({ id: 4, ...valor });
      }),
    };
    const service = crearServicio(manager);

    await service.crear(1, 5, dto, actor);

    expect(guardados[0]?.numero).toBe(4);
  });

  it('no registra asientos si el periodo está cerrado', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue({
        ...fondoAbierto,
        periodo: { ...fondoAbierto.periodo, estado: EstadoPeriodo.CERRADO },
      }),
    };
    const service = crearServicio(manager);

    await expect(service.crear(1, 5, dto, actor)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rechaza una fecha fuera del periodo', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue(fondoAbierto),
    };
    const service = crearServicio(manager);

    await expect(
      service.crear(1, 5, { ...dto, fecha: '2025-12-01' }, actor),
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
        transaction: jest.fn((operacion: (m: EntityManager) => unknown) =>
          operacion(manager as EntityManager),
        ),
      } as DataSource,
      policy,
    );
  }
});
