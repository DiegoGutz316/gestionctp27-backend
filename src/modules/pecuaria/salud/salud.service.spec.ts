import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { Animal } from '../animal/entities/animal.entity';
import { CondicionSalud } from './enums/condicion-salud.enum';
import { RegistroSalud } from './entities/registro-salud.entity';
import { SaludService } from './salud.service';

describe('SaludService', () => {
  const actor: UsuarioAutenticado = {
    id: 'b62082bb-17b7-49c1-994b-538d77bc814a',
    correo: 'docente@ctp.test',
    nombre: 'Docente pecuario',
    rol: RolUsuario.DOCENTE_PECUARIO,
  };

  const animalActivo = {
    id: 1,
    codigo: 'VAC-001',
    nombre: 'Luna',
    especie: 'VACA',
    estado: 'ACTIVO',
  } as Animal;

  const dto = {
    animalId: 1,
    fecha: '2026-09-08',
    condicionObservada: CondicionSalud.ENFERMO,
    diagnostico: 'Mastitis',
    observaciones: 'Inicio de tratamiento',
  };

  it('registra salud de un animal activo con fecha y usuario responsable', async () => {
    const { service, saludRepo } = crearServicio({ animal: animalActivo });

    const resultado = await service.registrar(dto, actor);

    expect(saludRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        animal: animalActivo,
        fecha: '2026-09-08',
        condicionObservada: CondicionSalud.ENFERMO,
        diagnostico: 'Mastitis',
        observaciones: 'Inicio de tratamiento',
        creadoPor: actor.id,
      }),
    );
    expect(resultado.animalId).toBe(1);
    expect(resultado.creadoPor).toBe(actor.id);
    expect(resultado.creadoEn).toEqual(
      new Date('2026-09-08T18:00:00.000Z'),
    );
  });

  it('rechaza el registro si el animal no existe', async () => {
    const { service, saludRepo } = crearServicio({ animal: null });

    await expect(service.registrar(dto, actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(saludRepo.save).not.toHaveBeenCalled();
  });

  it('rechaza el registro si el animal no está activo', async () => {
    const { service, saludRepo } = crearServicio({
      animal: { ...animalActivo, estado: 'INACTIVO' } as Animal,
    });

    await expect(service.registrar(dto, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(saludRepo.save).not.toHaveBeenCalled();
  });

  it('consulta el historial de salud asociado al animal', async () => {
    const registros = [
      {
        id: 2,
        animal: animalActivo,
        fecha: '2026-09-08',
        condicionObservada: CondicionSalud.ENFERMO,
        diagnostico: 'Mastitis',
        observaciones: null,
        creadoEn: new Date('2026-09-08T12:00:00.000Z'),
        creadoPor: actor.id,
      },
    ] as RegistroSalud[];
    const { service, saludRepo } = crearServicio({
      animal: animalActivo,
      registros,
    });

    const resultado = await service.consultar({ animalId: 1 });

    expect(resultado.animal.id).toBe(1);
    expect(resultado.registros).toHaveLength(1);
    expect(resultado.registros[0]?.condicionObservada).toBe(
      CondicionSalud.ENFERMO,
    );
    expect(saludRepo.find).toHaveBeenCalledWith({
      where: { animal: { id: animalActivo.id } },
      relations: { animal: true },
      order: { fecha: 'DESC', id: 'DESC' },
    });
  });
});

function crearServicio(opciones: {
  animal: Animal | null;
  registros?: RegistroSalud[];
}) {
  const animalesRepo = {
    findOne: jest.fn().mockResolvedValue(opciones.animal),
  };
  const saludRepo = {
    create: jest.fn((valor: unknown) => valor),
    save: jest.fn((valor: unknown) =>
      Promise.resolve({
        id: 8,
        ...(valor as object),
        creadoEn: new Date('2026-09-08T18:00:00.000Z'),
      }),
    ),
    find: jest.fn().mockResolvedValue(opciones.registros ?? []),
  };
  const service = new SaludService(
    animalesRepo as unknown as Repository<Animal>,
    saludRepo as unknown as Repository<RegistroSalud>,
  );

  return { service, saludRepo };
}
