import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';
import { CrearAnimalDto } from './dto/crear-animal.dto';
import { Animal } from './entities/animal.entity';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class AnimalService {
  constructor(
    @InjectRepository(Animal)
    private readonly animalesRepo: Repository<Animal>,
  ) {}

  async crear(dto: CrearAnimalDto, actor: UsuarioAutenticado): Promise<Animal> {
    const duplicado = await this.animalesRepo.findOne({
      where: {
        codigo: dto.codigo,
      },
    });

    if (duplicado) {
      this.lanzarCodigoDuplicado(dto.codigo);
    }

    const animal = this.animalesRepo.create({
      codigo: dto.codigo,
      nombre: dto.nombre,
      especie: dto.especie,
      raza: dto.raza,
      fechaNacimiento: dto.fechaNacimiento,
      estado: dto.estado,
      observaciones: dto.observaciones ?? null,

      // El responsable NO viene del frontend.
      // Se obtiene del usuario autenticado.
      creadoPor: actor.id,
    });

    try {
      return await this.animalesRepo.save(animal);
    } catch (error) {
      this.relanzarSiCodigoDuplicado(error, dto.codigo);

      throw error;
    }
  }

  private lanzarCodigoDuplicado(codigo: string): never {
    throw new ConflictException(
      `Ya existe un animal registrado con el código "${codigo}".`,
    );
  }

  private relanzarSiCodigoDuplicado(error: unknown, codigo: string): void {
    if (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
    ) {
      this.lanzarCodigoDuplicado(codigo);
    }
  }
}
