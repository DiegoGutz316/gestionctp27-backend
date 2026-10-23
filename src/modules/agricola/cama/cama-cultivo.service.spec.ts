import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError, type Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { Siembra } from '../siembra/entities/siembra.entity';
import { CamaCultivoService } from './cama-cultivo.service';
import { EstadoCamaCultivo } from './enums/estado-cama-cultivo.enum';
import { CamaCultivo } from './entities/cama-cultivo.entity';

describe('CamaCultivoService', () => {
  const actor: UsuarioAutenticado = {
    id: 'b62082bb-17b7-49c1-994b-538d77bc814a',
    correo: 'docente@ctp.test',
    nombre: 'Docente agrícola',
    rol: RolUsuario.DOCENTE_PECUARIO,
  };

  const dto = {
    codigo: 'CAMA-001',
    ubicacion: 'Invernadero 1',
    estado: EstadoCamaCultivo.DISPONIBLE,
  };

  it('registra correctamente una cama válida', async () => {
    const { service, camasRepo } = crearServicio({ duplicada: null });

    const resultado = await service.crear(dto, actor);

    expect(camasRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        codigo: 'CAMA-001',
        ubicacion: 'Invernadero 1',
        estado: EstadoCamaCultivo.DISPONIBLE,
        observaciones: null,
        creadoPor: actor.id,
      }),
    );
    expect(resultado.creadoPor).toBe(actor.id);
  });

  it('asigna creadoPor utilizando actor.id', async () => {
    const { service } = crearServicio({ duplicada: null });

    const resultado = await service.crear(dto, actor);

    expect(resultado.creadoPor).toBe(actor.id);
  });

  it('rechaza código duplicado detectado previamente', async () => {
    const existente = { id: 1, codigo: 'CAMA-001' } as CamaCultivo;
    const { service, camasRepo } = crearServicio({ duplicada: existente });

    await expect(service.crear(dto, actor)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(camasRepo.save).not.toHaveBeenCalled();
  });

  it('rechaza código duplicado detectado por la restricción UNIQUE', async () => {
    const { service, camasRepo } = crearServicio({ duplicada: null });
    const errorUnico = Object.assign(
      new QueryFailedError('insert', [], new Error('duplicate key')),
      { driverError: { code: '23505' } },
    );
    camasRepo.save.mockRejectedValueOnce(errorUnico);

    await expect(service.crear(dto, actor)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('deja la cama DISPONIBLE cuando el alta no envía estado', async () => {
    const { service, camasRepo } = crearServicio({ duplicada: null });

    await service.crear(
      {
        codigo: 'CAMA-001',
        ubicacion: 'Invernadero 1',
      },
      actor,
    );

    expect(camasRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: EstadoCamaCultivo.DISPONIBLE,
      }),
    );
  });

  it('permite registrar sin observaciones', async () => {
    const { service } = crearServicio({ duplicada: null });

    const resultado = await service.crear(dto, actor);

    expect(resultado.observaciones).toBeNull();
  });

  it('lista todas las camas registradas', async () => {
    const camas = [
      { id: 1, codigo: 'CAMA-001', estado: EstadoCamaCultivo.DISPONIBLE },
      { id: 2, codigo: 'CAMA-002', estado: EstadoCamaCultivo.SEMBRADA },
    ] as CamaCultivo[];
    const { service, consulta } = crearServicioParaListar(camas);

    const resultado = await service.listar({});

    expect(resultado).toEqual(camas);
    expect(consulta.andWhere).not.toHaveBeenCalled();
    expect(resultado.every((cama) => cama.cultivoActual === null)).toBe(true);
  });

  it('completa el cultivo actual con la siembra abierta más reciente', async () => {
    const camas = [
      { id: 1, codigo: 'CAMA-001' },
      { id: 2, codigo: 'CAMA-002' },
    ] as CamaCultivo[];
    const { service, siembrasRepo } = crearServicioParaListar(camas);
    siembrasRepo.find.mockResolvedValueOnce([
      {
        id: 8,
        tipoCultivo: 'Lechuga',
        cama: { id: 1 },
      },
      {
        id: 4,
        tipoCultivo: 'Tomate viejo',
        cama: { id: 1 },
      },
    ] as Siembra[]);

    const resultado = await service.listar({});

    expect(resultado[0].cultivoActual).toBe('Lechuga');
    expect(resultado[1].cultivoActual).toBeNull();
  });

  it('devuelve [] cuando no existen camas', async () => {
    const { service } = crearServicioParaListar([]);

    const resultado = await service.listar({});

    expect(resultado).toEqual([]);
  });

  it('busca por código mediante q', async () => {
    const camas = [
      { id: 1, codigo: 'CAMA-001', estado: EstadoCamaCultivo.DISPONIBLE },
    ] as CamaCultivo[];
    const { service, consulta } = crearServicioParaListar(camas);

    await service.listar({ q: 'CAMA' });

    expect(consulta.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('cama.codigo'),
      { q: '%CAMA%' },
    );
  });

  it('busca por estado mediante q', async () => {
    const camas = [
      { id: 1, codigo: 'CAMA-001', estado: EstadoCamaCultivo.DISPONIBLE },
    ] as CamaCultivo[];
    const { service, consulta } = crearServicioParaListar(camas);

    await service.listar({ q: 'DISPONIBLE' });

    expect(consulta.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('cama.estado'),
      { q: '%DISPONIBLE%' },
    );
  });

  it('filtra por ubicación del invernadero', async () => {
    const { service, consulta } = crearServicioParaListar([]);

    await service.listar({ ubicacion: 'Invernadero 1' });

    expect(consulta.andWhere).toHaveBeenCalledWith(
      'lower(cama.ubicacion) = lower(:ubicacion)',
      { ubicacion: 'Invernadero 1' },
    );
  });

  it('filtra por id de cama', async () => {
    const { service, consulta } = crearServicioParaListar([]);

    await service.listar({ camaId: 3 });

    expect(consulta.andWhere).toHaveBeenCalledWith('cama.id = :camaId', {
      camaId: 3,
    });
  });

  it('la búsqueda con q es insensible a mayúsculas/minúsculas', async () => {
    const camas = [] as CamaCultivo[];
    const { service, consulta } = crearServicioParaListar(camas);

    await service.listar({ q: 'en_uso' });

    expect(consulta.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('lower('),
      { q: '%en_uso%' },
    );
  });

  it('obtiene una cama existente por id', async () => {
    const cama = { id: 1, codigo: 'CAMA-001' } as CamaCultivo;
    const { service } = crearServicioParaObtener(cama);

    const resultado = await service.obtener(1);

    expect(resultado).toEqual(cama);
  });

  it('lanza NotFoundException cuando el id no existe', async () => {
    const { service } = crearServicioParaObtener(null);

    await expect(service.obtener(999)).rejects.toEqual(
      new NotFoundException('La cama de cultivo no existe.'),
    );
  });

  const dtoEdicion = {
    codigo: 'CAMA-001',
    ubicacion: 'Invernadero 2',
    estado: EstadoCamaCultivo.SEMBRADA,
    observaciones: 'Riego revisado.',
  };

  it('actualiza correctamente una cama existente', async () => {
    const cama = {
      id: 1,
      codigo: 'CAMA-001',
      ubicacion: 'Invernadero 1',
      estado: EstadoCamaCultivo.DISPONIBLE,
      observaciones: null,
    } as CamaCultivo;
    const { service, camasRepo } = crearServicioParaActualizar(cama);

    const resultado = await service.actualizar(1, dtoEdicion, actor);

    expect(camasRepo.save).toHaveBeenCalled();
    expect(resultado.ubicacion).toBe('Invernadero 2');
  });

  it('permite cambiar el código a uno no utilizado', async () => {
    const cama = { id: 1, codigo: 'CAMA-001' } as CamaCultivo;
    const { service, camasRepo } = crearServicioParaActualizar(cama, {
      duplicada: null,
    });

    const resultado = await service.actualizar(
      1,
      { ...dtoEdicion, codigo: 'CAMA-999' },
      actor,
    );

    expect(camasRepo.save).toHaveBeenCalled();
    expect(resultado.codigo).toBe('CAMA-999');
  });

  it('permite mantener el mismo código de la cama actual', async () => {
    const cama = { id: 1, codigo: 'CAMA-001' } as CamaCultivo;
    const { service, camasRepo, consultaDuplicado } =
      crearServicioParaActualizar(cama, { duplicada: null });

    const resultado = await service.actualizar(1, dtoEdicion, actor);

    expect(consultaDuplicado.andWhere).toHaveBeenCalledWith('cama.id != :id', {
      id: 1,
    });
    expect(camasRepo.save).toHaveBeenCalled();
    expect(resultado.codigo).toBe('CAMA-001');
  });

  it('rechaza cambiar el código por uno perteneciente a otra cama', async () => {
    const cama = { id: 1, codigo: 'CAMA-001' } as CamaCultivo;
    const otraCama = { id: 2, codigo: 'CAMA-002' } as CamaCultivo;
    const { service, camasRepo } = crearServicioParaActualizar(cama, {
      duplicada: otraCama,
    });

    await expect(
      service.actualizar(1, { ...dtoEdicion, codigo: 'CAMA-002' }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(camasRepo.save).not.toHaveBeenCalled();
  });

  it('captura el error 23505 durante una actualización', async () => {
    const cama = { id: 1, codigo: 'CAMA-001' } as CamaCultivo;
    const { service, camasRepo } = crearServicioParaActualizar(cama, {
      duplicada: null,
    });
    const errorUnico = Object.assign(
      new QueryFailedError('update', [], new Error('duplicate key')),
      { driverError: { code: '23505' } },
    );
    camasRepo.save.mockRejectedValueOnce(errorUnico);

    await expect(
      service.actualizar(1, dtoEdicion, actor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('sigue permitiendo cambiar la ubicación', async () => {
    const cama = { id: 1, codigo: 'CAMA-001' } as CamaCultivo;
    const { service } = crearServicioParaActualizar(cama);

    const resultado = await service.actualizar(1, dtoEdicion, actor);

    expect(resultado.ubicacion).toBe('Invernadero 2');
  });

  it('conserva el estado actual cuando la edición no lo envía', async () => {
    const cama = {
      id: 1,
      codigo: 'CAMA-001',
      estado: EstadoCamaCultivo.SEMBRADA,
    } as CamaCultivo;
    const { service } = crearServicioParaActualizar(cama);

    const resultado = await service.actualizar(
      1,
      {
        codigo: 'CAMA-001',
        ubicacion: 'Invernadero 2',
      },
      actor,
    );

    expect(resultado.estado).toBe(EstadoCamaCultivo.SEMBRADA);
  });

  it('sigue permitiendo cambiar el estado', async () => {
    const cama = { id: 1, codigo: 'CAMA-001' } as CamaCultivo;
    const { service } = crearServicioParaActualizar(cama);

    const resultado = await service.actualizar(1, dtoEdicion, actor);

    expect(resultado.estado).toBe(EstadoCamaCultivo.SEMBRADA);
  });

  it('sigue permitiendo cambiar las observaciones', async () => {
    const cama = { id: 1, codigo: 'CAMA-001' } as CamaCultivo;
    const { service } = crearServicioParaActualizar(cama);

    const resultado = await service.actualizar(1, dtoEdicion, actor);

    expect(resultado.observaciones).toBe('Riego revisado.');
  });

  it('asigna actualizadoPor utilizando actor.id', async () => {
    const cama = { id: 1, codigo: 'CAMA-001' } as CamaCultivo;
    const { service } = crearServicioParaActualizar(cama);

    const resultado = await service.actualizar(1, dtoEdicion, actor);

    expect(resultado.actualizadoPor).toBe(actor.id);
  });

  it('lanza NotFoundException al editar una cama que no existe', async () => {
    const { service, camasRepo } = crearServicioParaActualizar(null);

    await expect(service.actualizar(999, dtoEdicion, actor)).rejects.toEqual(
      new NotFoundException('La cama de cultivo no existe.'),
    );
    expect(camasRepo.save).not.toHaveBeenCalled();
  });

  it('guarda la entity actualizada mediante el repositorio', async () => {
    const cama = { id: 1, codigo: 'CAMA-001' } as CamaCultivo;
    const { service, camasRepo } = crearServicioParaActualizar(cama);

    await service.actualizar(1, dtoEdicion, actor);

    expect(camasRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        codigo: 'CAMA-001',
        ubicacion: 'Invernadero 2',
        observaciones: 'Riego revisado.',
        actualizadoPor: actor.id,
      }),
    );
  });
});

function crearServicio(opciones: { duplicada: CamaCultivo | null }) {
  const camasRepo = {
    findOne: jest.fn().mockResolvedValue(opciones.duplicada),
    create: jest.fn((valor: unknown) => valor as CamaCultivo),
    save: jest.fn((valor: unknown) =>
      Promise.resolve({
        id: 1,
        ...(valor as object),
        creadoEn: new Date('2026-09-12T12:00:00.000Z'),
      } as CamaCultivo),
    ),
  };
  const service = new CamaCultivoService(
    camasRepo as unknown as Repository<CamaCultivo>,
    repositorioSiembrasVacio() as unknown as Repository<Siembra>,
  );

  return { service, camasRepo };
}

function crearServicioParaObtener(cama: CamaCultivo | null) {
  const camasRepo = {
    findOne: jest.fn().mockResolvedValue(cama),
  };
  const service = new CamaCultivoService(
    camasRepo as unknown as Repository<CamaCultivo>,
    repositorioSiembrasVacio() as unknown as Repository<Siembra>,
  );

  return { service, camasRepo };
}

function crearServicioParaActualizar(
  cama: CamaCultivo | null,
  opciones: { duplicada: CamaCultivo | null } = { duplicada: null },
) {
  const consultaDuplicado = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(opciones.duplicada),
  };
  const camasRepo = {
    findOne: jest.fn().mockResolvedValue(cama),
    createQueryBuilder: jest.fn().mockReturnValue(consultaDuplicado),
    save: jest.fn((valor: unknown) => Promise.resolve(valor as CamaCultivo)),
  };
  const service = new CamaCultivoService(
    camasRepo as unknown as Repository<CamaCultivo>,
    repositorioSiembrasVacio() as unknown as Repository<Siembra>,
  );

  return { service, camasRepo, consultaDuplicado };
}

function crearServicioParaListar(camas: CamaCultivo[]) {
  const consulta = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(camas),
  };
  const camasRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(consulta),
  };
  const siembrasRepo = repositorioSiembrasVacio();
  const service = new CamaCultivoService(
    camasRepo as unknown as Repository<CamaCultivo>,
    siembrasRepo as unknown as Repository<Siembra>,
  );

  return { service, consulta, siembrasRepo };
}

function repositorioSiembrasVacio() {
  return {
    find: jest.fn().mockResolvedValue([] as Siembra[]),
  };
}
