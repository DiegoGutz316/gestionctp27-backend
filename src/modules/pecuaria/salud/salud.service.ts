import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { Animal } from '../animal/entities/animal.entity';
import { esAnimalActivo } from '../animal/enums/estado-animal.enum';
import { ConsultarSaludDto } from './dto/consultar-salud.dto';
import { RegistrarSaludDto } from './dto/registrar-salud.dto';
import { RegistroSalud } from './entities/registro-salud.entity';
import {
  mapearHistorialSalud,
  mapearSalud,
  type HistorialSaludRespuesta,
  type SaludRespuesta,
} from './respuestas/salud.mapper';

@Injectable()
export class SaludService {
  constructor(
    @InjectRepository(Animal)
    private readonly animalesRepo: Repository<Animal>,
    @InjectRepository(RegistroSalud)
    private readonly saludRepo: Repository<RegistroSalud>,
  ) {}

  async registrar(
    dto: RegistrarSaludDto,
    actor: UsuarioAutenticado,
  ): Promise<SaludRespuesta> {
    const animal = await this.buscarAnimal(dto.animalId);

    if (!esAnimalActivo(animal.estado)) {
      throw new BadRequestException(
        'Solo se puede registrar salud de un animal activo.',
      );
    }

    const registro = this.saludRepo.create({
      animal,
      fecha: dto.fecha,
      condicionObservada: dto.condicionObservada,
      diagnostico: dto.diagnostico ?? null,
      observaciones: dto.observaciones ?? null,
      creadoPor: actor.id,
    });

    const guardado = await this.saludRepo.save(registro);
    guardado.animal = animal;

    return mapearSalud(guardado);
  }

  async consultar(dto: ConsultarSaludDto): Promise<HistorialSaludRespuesta> {
    const animal = await this.buscarAnimal(dto.animalId);
    const registros = await this.saludRepo.find({
      where: { animal: { id: animal.id } },
      relations: { animal: true },
      order: { fecha: 'DESC', id: 'DESC' },
    });

    return mapearHistorialSalud(animal, registros);
  }

  private async buscarAnimal(id: number): Promise<Animal> {
    const animal = await this.animalesRepo.findOne({
      where: { id },
    });

    if (!animal) {
      throw new NotFoundException('El animal no existe.');
    }

    return animal;
  }
}
