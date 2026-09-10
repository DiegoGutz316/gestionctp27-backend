import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { CrearAnimalDto } from './dto/crear-animal.dto';
import { EditarAnimalDto } from './dto/editar-animal.dto';
import { Animal } from './entities/animal.entity';
import { EspecieAnimal } from './enums/especie-animal.enum';
import { EstadoAnimal } from './enums/estado-animal.enum';

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
      categoriaBovina: this.categoriaBovinaDe(dto),
      raza: dto.raza,
      fechaNacimiento: dto.fechaNacimiento,
      estado: dto.estado,
      observaciones: dto.observaciones ?? null,
      creadoPor: actor.id,
      actualizadoPor: null,
    });

    try {
      return await this.animalesRepo.save(animal);
    } catch (error) {
      this.relanzarSiCodigoDuplicado(error, dto.codigo);

      throw error;
    }
  }
  async listar(): Promise<Animal[]> {
    return await this.animalesRepo.find({
      order: {
        id: 'ASC',
      },
    });
  }

  async obtener(id: number): Promise<Animal> {
    const animal = await this.animalesRepo.findOne({
      where: {
        id,
      },
    });

    if (!animal) {
      throw new NotFoundException('El animal no existe.');
    }

    return animal;
  }

  async actualizar(
    id: number,
    dto: EditarAnimalDto,
    actor: UsuarioAutenticado,
  ): Promise<Animal> {
    const animal = await this.animalesRepo.findOne({
      where: {
        id,
      },
    });

    if (!animal) {
      throw new NotFoundException('El animal no existe.');
    }

    const duplicado = await this.animalesRepo
      .createQueryBuilder('animal')
      .where('animal.codigo = :codigo', {
        codigo: dto.codigo,
      })
      .andWhere('animal.id != :id', {
        id,
      })
      .getOne();

    if (duplicado) {
      this.lanzarCodigoDuplicado(dto.codigo);
    }

    Object.assign(animal, {
      codigo: dto.codigo,
      nombre: dto.nombre,
      especie: dto.especie,
      categoriaBovina: this.categoriaBovinaDe(dto),
      raza: dto.raza,
      fechaNacimiento: dto.fechaNacimiento,
      estado: dto.estado,
      observaciones: dto.observaciones ?? null,

      // Usuario autenticado que realizó la modificación.
      actualizadoPor: actor.id,
    });

    try {
      return await this.animalesRepo.save(animal);
    } catch (error) {
      this.relanzarSiCodigoDuplicado(error, dto.codigo);

      throw error;
    }
  }

  async desactivar(id: number, actor: UsuarioAutenticado): Promise<Animal> {
    const animal = await this.animalesRepo.findOne({
      where: {
        id,
      },
    });

    if (!animal) {
      throw new NotFoundException('El animal no existe.');
    }

    // Desactivación lógica:
    // el animal permanece en la base de datos.
    animal.estado = EstadoAnimal.INACTIVO;

    // Usuario responsable de la modificación.
    animal.actualizadoPor = actor.id;

    return await this.animalesRepo.save(animal);
  }

  private categoriaBovinaDe(
    dto: CrearAnimalDto | EditarAnimalDto,
  ): string | null {
    if (dto.especie !== EspecieAnimal.VACA) {
      return null;
    }

    if (!dto.categoriaBovina) {
      throw new BadRequestException(
        'Seleccione si es toro, novilla, vaca, ternero/a o torete.',
      );
    }

    return dto.categoriaBovina;
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
