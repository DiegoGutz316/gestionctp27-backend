import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';
import { CrearAnimalDto } from './dto/crear-animal.dto';
import { EditarAnimalDto } from './dto/editar-animal.dto';
import { FiltrarAnimalesDto } from './dto/filtrar-animales.dto';
import { Animal } from './entities/animal.entity';
import { OrdenAnimales } from './enums/orden-animales.enum';

const PG_UNIQUE_VIOLATION = '23505';

/**
 * Valor con el que `desactivar` marca la baja logica de un animal.
 *
 * `estado` es texto libre: los DTO de registro y edicion aceptan cualquier
 * grafia, asi que un animal guardado como "inactivo" tambien esta dado de baja
 * y hay que compararlo sin distinguir mayusculas. El frontend ya lo hace asi.
 */
const ESTADO_INACTIVO = 'INACTIVO';

const COLUMNA_DE_ORDEN: Record<OrdenAnimales, string> = {
  [OrdenAnimales.NOMBRE]: 'animal.nombre',
  [OrdenAnimales.CODIGO]: 'animal.codigo',
  [OrdenAnimales.ESTADO]: 'animal.estado',
};

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
  /**
   * Backlog 2.2 (Consultar animales).
   *
   * Por defecto se omiten los animales dados de baja, porque el criterio pide
   * el listado de los **activos**. La baja es lógica y se marca poniendo
   * `estado` en INACTIVO (ver `desactivar`), así que ese es el filtro.
   */
  async listar(filtros: FiltrarAnimalesDto): Promise<Animal[]> {
    const consulta = this.animalesRepo.createQueryBuilder('animal');

    if (!filtros.incluirInactivos) {
      consulta.where('lower(animal.estado) != lower(:inactivo)', {
        inactivo: ESTADO_INACTIVO,
      });
    }

    // "Buscar animales por código, nombre o estado": una sola búsqueda contra
    // los tres campos. Se compara en minúsculas para que no dependa de cómo
    // se haya tecleado.
    if (filtros.q) {
      consulta.andWhere(
        `(lower(animal.codigo) LIKE lower(:q)
          OR lower(animal.nombre) LIKE lower(:q)
          OR lower(animal.estado) LIKE lower(:q))`,
        { q: `%${filtros.q}%` },
      );
    }

    // El id desempata: sin él, dos animales con el mismo nombre o estado
    // podrían intercambiarse de posición entre consultas.
    consulta.orderBy(COLUMNA_DE_ORDEN[filtros.orden], 'ASC');
    consulta.addOrderBy('animal.id', 'ASC');

    return await consulta.getMany();
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
    animal.estado = ESTADO_INACTIVO;

    // Usuario responsable de la modificación.
    animal.actualizadoPor = actor.id;

    return await this.animalesRepo.save(animal);
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
