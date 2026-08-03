import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CategoriaInsumo } from '../entities/categoria-insumo.entity';
import { Insumo } from '../entities/insumo.entity';
import { CrearCategoriaInsumoDto } from '../dto/crear-categoria-insumo.dto';
import { CrearInsumoDto } from '../dto/crear-insumo.dto';
import { FiltrarInsumosDto } from '../dto/filtrar-insumos.dto';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(CategoriaInsumo)
    private readonly categoriasRepo: Repository<CategoriaInsumo>,
    @InjectRepository(Insumo)
    private readonly insumosRepo: Repository<Insumo>,
  ) {}

  listarCategorias(): Promise<CategoriaInsumo[]> {
    return this.categoriasRepo.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async crearCategoria(dto: CrearCategoriaInsumoDto): Promise<CategoriaInsumo> {
    const duplicada = await this.categoriasRepo
      .createQueryBuilder('categoria')
      .where('lower(categoria.nombre) = lower(:nombre)', {
        nombre: dto.nombre,
      })
      .andWhere('categoria.activo = true')
      .getOne();

    if (duplicada) {
      throw new ConflictException(
        `Ya existe una categoría llamada "${duplicada.nombre}".`,
      );
    }

    try {
      return await this.categoriasRepo.save(
        this.categoriasRepo.create({ nombre: dto.nombre }),
      );
    } catch (error) {
      this.relanzarSiEsDuplicado(
        error,
        `Ya existe una categoría llamada "${dto.nombre}".`,
      );
      throw error;
    }
  }

  listarInsumos(filtros: FiltrarInsumosDto = {}): Promise<Insumo[]> {
    // QueryBuilder no aplica relaciones eager automáticamente (a diferencia
    // de repo.find()); se hace el join explícito para incluir la categoría.
    const consulta = this.insumosRepo
      .createQueryBuilder('insumo')
      .leftJoinAndSelect('insumo.categoria', 'categoria')
      .where('insumo.activo = true')
      .orderBy('insumo.nombre', 'ASC');

    if (filtros.nombre) {
      consulta.andWhere('lower(insumo.nombre) LIKE lower(:nombre)', {
        nombre: `%${filtros.nombre}%`,
      });
    }

    if (filtros.categoriaId) {
      consulta.andWhere('insumo.categoria_id = :categoriaId', {
        categoriaId: filtros.categoriaId,
      });
    }

    return consulta.getMany();
  }

  async crearInsumo(dto: CrearInsumoDto): Promise<Insumo> {
    const categoria = await this.categoriasRepo.findOneBy({
      id: dto.categoriaId,
    });

    if (!categoria || !categoria.activo) {
      throw new NotFoundException(
        'La categoría seleccionada no existe o está inactiva.',
      );
    }

    const duplicado = await this.insumosRepo
      .createQueryBuilder('insumo')
      .where('lower(insumo.nombre) = lower(:nombre)', { nombre: dto.nombre })
      .andWhere('insumo.categoria_id = :categoriaId', {
        categoriaId: categoria.id,
      })
      .andWhere('insumo.activo = true')
      .getOne();

    if (duplicado) {
      throw new ConflictException(
        `Ya existe un insumo llamado "${duplicado.nombre}" en la categoría "${categoria.nombre}".`,
      );
    }

    try {
      const insumo = this.insumosRepo.create({
        nombre: dto.nombre,
        categoria,
        unidadMedida: dto.unidadMedida,
        cantidad: dto.cantidad,
        nivelMinimo: dto.nivelMinimo,
        // TODO(Feature 1 - auth): asignar el usuario autenticado.
        creadoPor: null,
      });
      return await this.insumosRepo.save(insumo);
    } catch (error) {
      this.relanzarSiEsDuplicado(
        error,
        `Ya existe un insumo llamado "${dto.nombre}" en la categoría "${categoria.nombre}".`,
      );
      throw error;
    }
  }

  // Red de seguridad ante condiciones de carrera: si dos peticiones pasan la
  // verificación previa a la vez, el índice único de la BD rechaza la segunda.
  private relanzarSiEsDuplicado(error: unknown, mensaje: string): void {
    if (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
    ) {
      throw new ConflictException(mensaje);
    }
  }
}
