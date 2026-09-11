import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';
import { estaInactivo } from './animal-estado';
import { CrearVacunaDto } from './animal/dto/crear-vacuna.dto';
import { Animal } from './animal/entities/animal.entity';
import { Vacuna } from './animal/entities/vacuna.entity';

@Injectable()
export class VacunaService {
  constructor(
    @InjectRepository(Vacuna)
    private readonly vacunasRepo: Repository<Vacuna>,

    @InjectRepository(Animal)
    private readonly animalesRepo: Repository<Animal>,
  ) {}

  /**
   * Backlog 2.5: "Los usuarios autorizados pueden registrar una vacuna para
   * un animal activo" y "la vacuna debe asociarse a un animal existente".
   *
   * Misma estrategia que DesparasitacionService.crear: comprobacion e
   * insercion van en una transaccion con la fila del animal bloqueada
   * (`FOR UPDATE`), para que no exista una ventana entre leer el estado del
   * animal y guardar la vacuna en la que otro usuario lo desactive primero.
   */
  async crear(
    dto: CrearVacunaDto,
    actor: UsuarioAutenticado,
  ): Promise<Vacuna> {
    return await this.vacunasRepo.manager.transaction(async (gestor) => {
      const animal = await gestor
        .createQueryBuilder(Animal, 'animal')
        .setLock('pessimistic_write')
        .where('animal.id = :id', { id: dto.animalId })
        .getOne();

      if (!animal) {
        throw new NotFoundException('El animal no existe.');
      }

      if (estaInactivo(animal.estado)) {
        throw new BadRequestException(
          'El animal está dado de baja y no admite nuevos registros sanitarios.',
        );
      }

      const vacuna = gestor.create(Vacuna, {
        animalId: animal.id,
        tipoVacuna: dto.tipoVacuna,
        fecha: dto.fecha,
        dosis: dto.dosis,
        observaciones: dto.observaciones ?? null,

        // El responsable sale de la sesion, nunca del cuerpo de la peticion.
        creadoPor: actor.id,
      });

      return await gestor.save(vacuna);
    });
  }

  /**
   * Backlog 2.6: "consultar las vacunas de un animal para revisar su
   * historial sanitario".
   *
   * A diferencia de `crear`, aquí el animal inactivo sí debe poder
   * consultarse: la baja es lógica y el historial sanitario debe seguir
   * disponible después de ella, así que no se usa `estaInactivo()`. Tampoco
   * hace falta transacción ni bloqueo: es una lectura, no hay una condición
   * de carrera que evitar.
   */
  async listarPorAnimal(animalId: number): Promise<Vacuna[]> {
    const animal = await this.animalesRepo.findOne({
      where: {
        id: animalId,
      },
    });

    if (!animal) {
      throw new NotFoundException('El animal no existe.');
    }

    return await this.vacunasRepo.find({
      where: {
        animalId: animal.id,
      },
      order: {
        fecha: 'DESC',
        id: 'DESC',
      },
    });
  }
}
