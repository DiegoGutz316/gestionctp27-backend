import { NotFoundException } from '@nestjs/common';
import type { EntityManager, Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';
import { RolUsuario } from '../usuarios/enums/rol-usuario.enum';
import type { CrearDesparasitacionDto } from './animal/dto/crear-desparasitacion.dto';
import { Desparasitacion } from './animal/entities/desparasitacion.entity';
import { DesparasitacionService } from './desparasitacion.service';

describe('DesparasitacionService', () => {
  const actor: UsuarioAutenticado = {
    id: 'b62082bb-17b7-49c1-994b-538d77bc814a',
    correo: 'docente@ctp.test',
    nombre: 'Docente pecuario',
    rol: RolUsuario.DOCENTE_PECUARIO,
  };

  const dto: CrearDesparasitacionDto = {
    animalId: 999999,
    producto: 'Ivermectina 1%',
    fecha: '2026-09-10',
  };

  it('rechaza el registro si el animal no existe y no guarda la desparasitación', async () => {
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
    const repo = {
      manager: {
        transaction: jest.fn((accion: (manager: EntityManager) => unknown) =>
          accion(gestor as unknown as EntityManager),
        ),
      },
    };
    const service = new DesparasitacionService(
      repo as unknown as Repository<Desparasitacion>,
    );

    await expect(service.crear(dto, actor)).rejects.toThrow(
      new NotFoundException('El animal no existe.'),
    );
    expect(gestor.create).not.toHaveBeenCalled();
    expect(gestor.save).not.toHaveBeenCalled();
  });
});
