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
  ) {}

  /**
   * Backlog 2.7: "Los usuarios autorizados pueden registrar una desparasitacion
   * para un animal activo" y "El sistema valida que el animal seleccionado
   * exista".
   *
   * Son dos comprobaciones distintas y merecen respuestas distintas: un animal
   * que no existe es un 404, y uno dado de baja es una peticion valida contra
   * un animal que no admite el registro.
   *
   * Comprobacion e insercion van en una transaccion con la fila del animal
   * bloqueada (`FOR UPDATE`). Sin ese bloqueo hay una ventana real: si entre la
   * lectura y el insert otro usuario da de baja al animal, la desparasitacion
   * se guardaba igual y quedaba un registro sanitario sobre un animal inactivo.
   * El bloqueo hace esperar al PATCH de desactivacion hasta que esta
   * transaccion termine, y al reves obliga a leer el estado ya confirmado.
   *
   * Es el mismo problema que el modulo de inventario resuelve en la base con el
   * trigger de `movimientos_stock`; aqui basta el bloqueo porque solo hay que
   * validar el estado, no modificar al animal.
   */
  async crear(
    dto: CrearDesparasitacionDto,
    actor: UsuarioAutenticado,
  ): Promise<Desparasitacion> {
    return await this.desparasitacionesRepo.manager.transaction(
      async (gestor) => {
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

        const desparasitacion = gestor.create(Desparasitacion, {
          animalId: animal.id,
          producto: dto.producto,
          fecha: dto.fecha,
          observaciones: dto.observaciones ?? null,

          // El responsable sale de la sesion, nunca del cuerpo de la peticion.
          creadoPor: actor.id,
        });

        return await gestor.save(desparasitacion);
      },
    );
  }
}
