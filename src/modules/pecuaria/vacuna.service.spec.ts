import { NotFoundException } from '@nestjs/common';
import type { EntityManager, Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';
import { RolUsuario } from '../usuarios/enums/rol-usuario.enum';
import type { CrearVacunaDto } from './animal/dto/crear-vacuna.dto';
import { Animal } from './animal/entities/animal.entity';
import { Vacuna } from './animal/entities/vacuna.entity';
import { VacunaService } from './vacuna.service';

describe('VacunaService', () => {
  const actor: UsuarioAutenticado = {
    id: 'b62082bb-17b7-49c1-994b-538d77bc814a',
    correo: 'docente@ctp.test',
    nombre: 'Docente pecuario',
    rol: RolUsuario.DOCENTE_PECUARIO,
  };

  const dto: CrearVacunaDto = {
    animalId: 999999,
    tipoVacuna: 'Fiebre aftosa',
    fecha: '2026-09-10',
    dosis: '5 ml',
  };

  it('rechaza el registro si el animal no existe y no guarda la vacuna', async () => {
    const consulta = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    const gestor = {
      createQueryBuilder: jest.fn().mockReturnValue(consulta),
      create: jest.fn(),
      save: jest.fn(),
    };
    const vacunasRepo = {
      manager: {
        transaction: jest.fn((accion: (manager: EntityManager) => unknown) =>
          accion(gestor as unknown as EntityManager),
        ),
      },
    };
    const service = new VacunaService(
      vacunasRepo as unknown as Repository<Vacuna>,
      {} as Repository<Animal>,
    );

    await expect(service.crear(dto, actor)).rejects.toThrow(
      new NotFoundException('El animal no existe.'),
    );
    expect(gestor.create).not.toHaveBeenCalled();
    expect(gestor.save).not.toHaveBeenCalled();
  });
});
