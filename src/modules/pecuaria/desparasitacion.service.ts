import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';
import { estaInactivo } from './animal-estado';
import { CrearDesparasitacionDto } from './dto/crear-desparasitacion.dto';
import { Animal } from './entities/animal.entity';
import { Desparasitacion } from './entities/desparasitacion.entity';

@Injectable()
export class DesparasitacionService {
  constructor(
    @InjectRepository(Desparasitacion)
    private readonly desparasitacionesRepo: Repository<Desparasitacion>,
    @InjectRepository(Animal)
    private readonly animalesRepo: Repository<Animal>,
  ) {}

  /**
   * Backlog 2.7: "Los usuarios autorizados pueden registrar una desparasitacion
   * para un animal activo" y "El sistema valida que el animal seleccionado
   * exista".
   *
   * Son dos comprobaciones distintas y merecen respuestas distintas: un animal
   * que no existe es un 404, y uno dado de baja es una peticion valida contra
   * un animal que no admite el registro.
   */
  async crear(
    dto: CrearDesparasitacionDto,
    actor: UsuarioAutenticado,
  ): Promise<Desparasitacion> {
    const animal = await this.animalesRepo.findOne({
      where: {
        id: dto.animalId,
      },
    });

    if (!animal) {
      throw new NotFoundException('El animal no existe.');
    }

    if (estaInactivo(animal.estado)) {
      throw new BadRequestException(
        'El animal está dado de baja y no admite nuevos registros sanitarios.',
      );
    }

    const desparasitacion = this.desparasitacionesRepo.create({
      animalId: animal.id,
      producto: dto.producto,
      fecha: dto.fecha,
      observaciones: dto.observaciones ?? null,

      // El responsable sale de la sesion, nunca del cuerpo de la peticion.
      creadoPor: actor.id,
    });

    return await this.desparasitacionesRepo.save(desparasitacion);
  }
}
