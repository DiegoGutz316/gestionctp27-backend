import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Producto } from './entities/producto.entity';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { EditarProductoDto } from './dto/editar-producto.dto';
import { FiltrarProductosDto } from './dto/filtrar-productos.dto';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class ProductoService {
  constructor(
    @InjectRepository(Producto)
    private readonly productosRepo: Repository<Producto>,
  ) {}

  listar(filtros: FiltrarProductosDto = {}): Promise<Producto[]> {
    const consulta = this.productosRepo
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.stock', 'stock', 'stock.activo = true')
      .where('producto.activo = true')
      .orderBy('producto.nombre', 'ASC');

    if (filtros.nombre) {
      consulta.andWhere('lower(producto.nombre) LIKE lower(:nombre)', {
        nombre: `%${filtros.nombre}%`,
      });
    }

    if (filtros.tipoProducto) {
      consulta.andWhere('producto.tipo_producto = :tipoProducto', {
        tipoProducto: filtros.tipoProducto,
      });
    }

    if (filtros.departamento) {
      consulta.andWhere('producto.departamento = :departamento', {
        departamento: filtros.departamento,
      });
    }

    if (filtros.ubicacion) {
      consulta.andWhere('producto.ubicacion = :ubicacion', {
        ubicacion: filtros.ubicacion,
      });
    }

    return consulta.getMany();
  }

  async crear(dto: CrearProductoDto): Promise<Producto> {
    const duplicado = await this.buscarDuplicado(dto.nombre);
    if (duplicado) {
      throw new ConflictException(
        `Ya existe un producto llamado "${duplicado.nombre}".`,
      );
    }

    try {
      return await this.productosRepo.save(
        this.productosRepo.create(this.aCampos(dto)),
      );
    } catch (error) {
      this.relanzarSiEsDuplicado(
        error,
        `Ya existe un producto llamado "${dto.nombre}".`,
      );
      throw error;
    }
  }

  async obtener(id: number): Promise<Producto> {
    const producto = await this.productosRepo
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.stock', 'stock', 'stock.activo = true')
      .where('producto.id = :id', { id })
      .andWhere('producto.activo = true')
      .getOne();

    if (!producto) {
      throw new NotFoundException('El producto no existe.');
    }

    return producto;
  }

  async actualizar(id: number, dto: EditarProductoDto): Promise<Producto> {
    const producto = await this.obtener(id);

    const duplicado = await this.buscarDuplicado(dto.nombre, id);
    if (duplicado) {
      throw new ConflictException(
        `Ya existe un producto llamado "${duplicado.nombre}".`,
      );
    }

    Object.assign(producto, this.aCampos(dto));

    try {
      return await this.productosRepo.save(producto);
    } catch (error) {
      this.relanzarSiEsDuplicado(
        error,
        `Ya existe un producto llamado "${dto.nombre}".`,
      );
      throw error;
    }
  }

  private aCampos(dto: CrearProductoDto | EditarProductoDto) {
    return {
      nombre: dto.nombre,
      tipoProducto: dto.tipoProducto,
      unidadMedida: dto.unidadMedida,
      departamento: dto.departamento,
      ubicacion: dto.ubicacion,
    };
  }

  private buscarDuplicado(nombre: string, excluirId?: number) {
    const consulta = this.productosRepo
      .createQueryBuilder('producto')
      .where('lower(producto.nombre) = lower(:nombre)', { nombre })
      .andWhere('producto.activo = true');

    if (excluirId) {
      consulta.andWhere('producto.id != :excluirId', { excluirId });
    }

    return consulta.getOne();
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
