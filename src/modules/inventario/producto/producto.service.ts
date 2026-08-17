import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import {
  crearResultadoPaginado,
  paginarQueryBuilder,
} from '../../../common/paginacion/helpers/paginar.helper';
import type { ResultadoPaginado } from '../../../common/paginacion/tipos/resultado-paginado';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import {
  AccionAuditoriaInventario,
  AuditoriaInventario,
  RecursoAuditoriaInventario,
} from '../entities/auditoria-inventario.entity';
import { InventarioPolicy } from '../inventario.policy';
import {
  mapearProducto,
  type ProductoRespuesta,
} from '../respuestas/inventario.mapper';
import { ConfiguracionStock } from '../stock/entities/configuracion-stock.entity';
import { Inventario } from '../stock/entities/inventario.entity';
import { MovimientoStock } from '../stock/entities/movimiento-stock.entity';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { EditarProductoDto } from './dto/editar-producto.dto';
import { FiltrarProductosDto } from './dto/filtrar-productos.dto';
import { Producto } from './entities/producto.entity';
import { UnidadMedida } from './enums/unidad-medida.enum';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class ProductoService {
  constructor(
    @InjectRepository(Producto)
    private readonly productosRepo: Repository<Producto>,
    private readonly dataSource: DataSource,
    private readonly policy: InventarioPolicy,
  ) {}

  async listar(
    filtros: FiltrarProductosDto,
    actor: UsuarioAutenticado,
  ): Promise<ResultadoPaginado<ProductoRespuesta>> {
    const consulta = this.productosRepo
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.configuracionStock', 'configuracionStock')
      .leftJoinAndSelect(
        'producto.inventario',
        'inventario',
        'inventario.activo = true',
      )
      .where('producto.activo = true')
      .orderBy('producto.nombre', 'ASC')
      .addOrderBy('producto.id', 'ASC');

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
    const departamentoPermitido = this.policy.limitarDepartamento(actor);
    if (departamentoPermitido) {
      consulta.andWhere('producto.departamento = :departamentoPermitido', {
        departamentoPermitido,
      });
    } else if (filtros.departamento) {
      consulta.andWhere('producto.departamento = :departamento', {
        departamento: filtros.departamento,
      });
    }
    if (filtros.ubicacion) {
      consulta.andWhere('producto.ubicacion = :ubicacion', {
        ubicacion: filtros.ubicacion,
      });
    }

    const { entidades, total } = await paginarQueryBuilder(consulta, filtros);
    return crearResultadoPaginado(
      entidades.map(mapearProducto),
      filtros,
      total,
    );
  }

  async crear(
    dto: CrearProductoDto,
    actor: UsuarioAutenticado,
  ): Promise<ProductoRespuesta> {
    this.policy.exigirAdministrador(actor);
    try {
      const producto = await this.dataSource.transaction(async (manager) => {
        const duplicado = await manager
          .createQueryBuilder(Producto, 'producto')
          .where('lower(producto.nombre) = lower(:nombre)', {
            nombre: dto.nombre,
          })
          .andWhere('producto.activo = true')
          .getOne();
        if (duplicado) this.lanzarDuplicado(duplicado.nombre);

        const creado = await manager.save(
          manager.create(Producto, {
            ...this.aCampos(dto),
            creadoPor: actor.id,
            actualizadoPor: null,
          }),
        );
        await manager.save(
          manager.create(AuditoriaInventario, {
            accion: AccionAuditoriaInventario.CREAR,
            recurso: RecursoAuditoriaInventario.PRODUCTO,
            recursoId: creado.id,
            actorId: actor.id,
            datos: this.aCampos(dto),
          }),
        );
        return creado;
      });
      return mapearProducto(producto);
    } catch (error) {
      this.relanzarSiEsDuplicado(error, dto.nombre);
      throw error;
    }
  }

  async obtener(
    id: number,
    actor: UsuarioAutenticado,
  ): Promise<ProductoRespuesta> {
    const producto = await this.buscarCompleto(id);
    this.policy.exigirLectura(actor, producto.departamento);
    return mapearProducto(producto);
  }

  async actualizar(
    id: number,
    dto: EditarProductoDto,
    actor: UsuarioAutenticado,
  ): Promise<ProductoRespuesta> {
    this.policy.exigirAdministrador(actor);
    try {
      await this.dataSource.transaction(async (manager) => {
        const producto = await manager
          .createQueryBuilder(Producto, 'producto')
          .setLock('pessimistic_write')
          .where('producto.id = :id', { id })
          .andWhere('producto.activo = true')
          .getOne();
        if (!producto) throw new NotFoundException('El producto no existe.');

        const anterior = this.aCampos(producto);

        const duplicado = await manager
          .createQueryBuilder(Producto, 'otro')
          .where('lower(otro.nombre) = lower(:nombre)', { nombre: dto.nombre })
          .andWhere('otro.activo = true')
          .andWhere('otro.id != :id', { id })
          .getOne();
        if (duplicado) this.lanzarDuplicado(duplicado.nombre);

        if (producto.unidadMedida !== dto.unidadMedida) {
          await this.validarCambioUnidad(manager, producto, dto.unidadMedida);
        }

        Object.assign(producto, this.aCampos(dto), {
          actualizadoPor: actor.id,
        });
        await manager.save(producto);
        await manager.save(
          manager.create(AuditoriaInventario, {
            accion: AccionAuditoriaInventario.EDITAR,
            recurso: RecursoAuditoriaInventario.PRODUCTO,
            recursoId: producto.id,
            actorId: actor.id,
            datos: { anterior, nuevo: this.aCampos(producto) },
          }),
        );
      });
      return mapearProducto(await this.buscarCompleto(id));
    } catch (error) {
      this.relanzarSiEsDuplicado(error, dto.nombre);
      throw error;
    }
  }

  private async validarCambioUnidad(
    manager: import('typeorm').EntityManager,
    producto: Producto,
    nuevaUnidad: UnidadMedida,
  ): Promise<void> {
    const inventario = await manager
      .createQueryBuilder(Inventario, 'inventario')
      .setLock('pessimistic_write')
      .where('inventario.producto_id = :productoId', {
        productoId: producto.id,
      })
      .getOne();
    const configuracion = await manager
      .createQueryBuilder(ConfiguracionStock, 'configuracion')
      .setLock('pessimistic_write')
      .where('configuracion.producto_id = :productoId', {
        productoId: producto.id,
      })
      .getOne();
    const movimientos = inventario
      ? await manager.count(MovimientoStock, {
          where: { inventario: { id: inventario.id } },
        })
      : 0;
    if (movimientos > 0) {
      throw new ConflictException(
        'No se puede cambiar la unidad de un producto con movimientos.',
      );
    }
    if (
      nuevaUnidad === UnidadMedida.UNIDAD &&
      ((inventario && !Number.isInteger(inventario.cantidadActual)) ||
        (configuracion && !Number.isInteger(configuracion.stockMinimo)))
    ) {
      throw new BadRequestException(
        'El saldo y el stock mínimo deben ser enteros para usar la unidad UNIDAD.',
      );
    }
  }

  private async buscarCompleto(id: number): Promise<Producto> {
    const producto = await this.productosRepo
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.configuracionStock', 'configuracionStock')
      .leftJoinAndSelect(
        'producto.inventario',
        'inventario',
        'inventario.activo = true',
      )
      .where('producto.id = :id', { id })
      .andWhere('producto.activo = true')
      .getOne();
    if (!producto) throw new NotFoundException('El producto no existe.');
    return producto;
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

  private lanzarDuplicado(nombre: string): never {
    throw new ConflictException(`Ya existe un producto llamado "${nombre}".`);
  }

  private relanzarSiEsDuplicado(error: unknown, nombre: string): void {
    if (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
    ) {
      this.lanzarDuplicado(nombre);
    }
  }
}
