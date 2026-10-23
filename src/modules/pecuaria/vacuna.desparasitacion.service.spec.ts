/**
 * Pruebas unitarias - VacunaService y DesparasitacionService
 * (soporte de POST /pecuaria/vacunas, POST /pecuaria/desparasitaciones y de sus
 * listados por animal). Ambos comparten reglas: el animal debe existir y no
 * estar dado de baja.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  crearQueryBuilderSimulado,
  crearRepositorioSimulado,
} from '../../../test/helpers/typeorm-mocks';
import { RolUsuario } from '../usuarios/enums/rol-usuario.enum';
import { DesparasitacionService } from './desparasitacion.service';
import { VacunaService } from './vacuna.service';

const actor = {
  id: 'u-1',
  correo: 'a@x.cr',
  nombre: 'A',
  rol: RolUsuario.DOCENTE_PECUARIO,
};

/** Repositorio cuyo manager ejecuta la transacción con un gestor simulado. */
function repoConTransaccion(animal: unknown) {
  const repo = crearRepositorioSimulado();
  const gestor = {
    createQueryBuilder: jest.fn(() =>
      crearQueryBuilderSimulado({ getOne: animal }),
    ),
    create: jest.fn((_c: unknown, d: object) => d),
    save: jest.fn((e: object) => Promise.resolve({ id: 1, ...e })),
  };
  Object.assign(repo, {
    manager: {
      transaction: jest.fn((fn: (g: typeof gestor) => unknown) => fn(gestor)),
      findOne: jest.fn(),
    },
  });
  return { repo, gestor };
}

describe('VacunaService', () => {
  const dto = {
    animalId: 4,
    tipoVacuna: 'Aftosa',
    fecha: '2026-09-10',
    dosis: '5 ml',
  };

  it('registra la vacuna con el actor como responsable (nunca del cuerpo)', async () => {
    const { repo, gestor } = repoConTransaccion({ id: 4, estado: 'ACTIVO' });
    const servicio = new VacunaService(
      repo as never,
      crearRepositorioSimulado() as never,
    );

    const r = await servicio.crear({ ...dto, observaciones: 'ok' }, actor);

    expect(gestor.create).toHaveBeenCalledWith(expect.anything(), {
      animalId: 4,
      tipoVacuna: 'Aftosa',
      fecha: '2026-09-10',
      dosis: '5 ml',
      observaciones: 'ok',
      creadoPor: 'u-1',
    });
    expect(r).toMatchObject({ id: 1, animalId: 4 });
  });

  it('observaciones ausentes se guardan como null', async () => {
    const { repo, gestor } = repoConTransaccion({ id: 4, estado: 'ACTIVO' });
    await new VacunaService(
      repo as never,
      crearRepositorioSimulado() as never,
    ).crear(dto, actor);
    expect(gestor.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ observaciones: null }),
    );
  });

  it.each(['INACTIVO', ' inactivo ', 'Inactivo'])(
    'animal dado de baja (%j): 400 y no guarda',
    async (estado) => {
      const { repo, gestor } = repoConTransaccion({ id: 4, estado });
      await expect(
        new VacunaService(
          repo as never,
          crearRepositorioSimulado() as never,
        ).crear(dto, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(gestor.save).not.toHaveBeenCalled();
    },
  );

  describe('listarPorAnimal', () => {
    it('devuelve las vacunas, la más reciente primero', async () => {
      const animales = crearRepositorioSimulado();
      const vacunas = crearRepositorioSimulado();
      animales.findOne.mockResolvedValue({ id: 4 });
      vacunas.find.mockResolvedValue([{ id: 2 }, { id: 1 }]);

      const r = await new VacunaService(
        vacunas as never,
        animales as never,
      ).listarPorAnimal(4);

      expect(vacunas.find).toHaveBeenCalledWith({
        where: { animalId: 4 },
        order: { fecha: 'DESC', id: 'DESC' },
      });
      expect(r).toEqual([{ id: 2 }, { id: 1 }]);
    });

    it('404 si el animal no existe', async () => {
      const animales = crearRepositorioSimulado();
      const vacunas = crearRepositorioSimulado();
      animales.findOne.mockResolvedValue(null);
      await expect(
        new VacunaService(vacunas as never, animales as never).listarPorAnimal(
          4,
        ),
      ).rejects.toThrow(new NotFoundException('El animal no existe.'));
      expect(vacunas.find).not.toHaveBeenCalled();
    });

    it('un animal inactivo SÍ puede consultarse (historial)', async () => {
      const animales = crearRepositorioSimulado();
      const vacunas = crearRepositorioSimulado();
      animales.findOne.mockResolvedValue({ id: 4, estado: 'INACTIVO' });
      vacunas.find.mockResolvedValue([]);
      await expect(
        new VacunaService(vacunas as never, animales as never).listarPorAnimal(
          4,
        ),
      ).resolves.toEqual([]);
    });
  });
});

describe('DesparasitacionService', () => {
  const dto = { animalId: 4, producto: 'Ivermectina', fecha: '2026-09-10' };

  it('registra la desparasitación con el actor como responsable', async () => {
    const { repo, gestor } = repoConTransaccion({ id: 4, estado: 'ACTIVO' });

    const r = await new DesparasitacionService(repo as never).crear(
      { ...dto, observaciones: 'rutina' },
      actor,
    );

    expect(gestor.create).toHaveBeenCalledWith(expect.anything(), {
      animalId: 4,
      producto: 'Ivermectina',
      fecha: '2026-09-10',
      observaciones: 'rutina',
      creadoPor: 'u-1',
    });
    expect(r).toMatchObject({ id: 1 });
  });

  it('404 si el animal no existe', async () => {
    const { repo, gestor } = repoConTransaccion(null);
    await expect(
      new DesparasitacionService(repo as never).crear(dto, actor),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(gestor.save).not.toHaveBeenCalled();
  });

  it('animal dado de baja: 400 y no guarda', async () => {
    const { repo, gestor } = repoConTransaccion({ id: 4, estado: 'INACTIVO' });
    await expect(
      new DesparasitacionService(repo as never).crear(dto, actor),
    ).rejects.toThrow('dado de baja');
    expect(gestor.save).not.toHaveBeenCalled();
  });

  describe('listarPorAnimal', () => {
    it('devuelve el historial ordenado por fecha descendente', async () => {
      const repo = crearRepositorioSimulado();
      Object.assign(repo, {
        manager: { findOne: jest.fn().mockResolvedValue({ id: 4 }) },
      });
      repo.find.mockResolvedValue([{ id: 2 }]);

      const r = await new DesparasitacionService(repo as never).listarPorAnimal(
        4,
      );

      expect(repo.find).toHaveBeenCalledWith({
        where: { animalId: 4 },
        order: { fecha: 'DESC', id: 'DESC' },
      });
      expect(r).toEqual([{ id: 2 }]);
    });

    it('404 si el animal no existe', async () => {
      const repo = crearRepositorioSimulado();
      Object.assign(repo, {
        manager: { findOne: jest.fn().mockResolvedValue(null) },
      });
      await expect(
        new DesparasitacionService(repo as never).listarPorAnimal(4),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.find).not.toHaveBeenCalled();
    });
  });
});
