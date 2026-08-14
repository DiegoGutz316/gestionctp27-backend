import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { CategoriaInsumo } from '../entities/categoria-insumo.entity';
import { Insumo } from '../entities/insumo.entity';
import { MovimientoInventario } from '../entities/movimiento-inventario.entity';
import { TipoMovimiento } from '../enums/tipo-movimiento.enum';
import { CrearCategoriaInsumoDto } from '../dto/crear-categoria-insumo.dto';
import { CrearInsumoDto } from '../dto/crear-insumo.dto';
import { EditarInsumoDto } from '../dto/editar-insumo.dto';
import { FiltrarInsumosDto } from '../dto/filtrar-insumos.dto';
import { RegistrarEntradaDto } from '../dto/registrar-entrada.dto';
import { ConsultarEntradasDto } from '../dto/consultar-entradas.dto';
import { VALOR_MAXIMO, VALOR_MAXIMO_TEXTO } from '../dto/limites-numericos';
import {
  crearResultadoPaginado,
  paginarQueryBuilder,
} from '../../../common/paginacion/helpers/paginar.helper';
import type { ResultadoPaginado } from '../../../common/paginacion/tipos/resultado-paginado';
import type { UnidadMedida } from '../enums/unidad-medida.enum';

const PG_UNIQUE_VIOLATION = '23505';

/**
 * Forma de una entrada en el historial (backlog 4.5).
 *
 * Se mapea a mano en lugar de devolver la entidad para no exponer del usuario
 * responsable más que su nombre: quien consulta el inventario no necesa­riamente
 * tiene permiso sobre el módulo de usuarios.
 */
export interface EntradaRespuesta {
  id: number;
  cantidad: number;
  fecha: string;
  origen: string | null;
  creadoEn: Date;
  insumo: { id: number; nombre: string; unidadMedida: UnidadMedida };
  responsable: { id: string; nombre: string };
}

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(CategoriaInsumo)
    private readonly categoriasRepo: Repository<CategoriaInsumo>,
    @InjectRepository(Insumo)
    private readonly insumosRepo: Repository<Insumo>,
    @InjectRepository(MovimientoInventario)
    private readonly movimientosRepo: Repository<MovimientoInventario>,
    private readonly dataSource: DataSource,
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

  async obtenerInsumo(id: number): Promise<Insumo> {
    const insumo = await this.insumosRepo.findOneBy({ id, activo: true });

    if (!insumo) {
      throw new NotFoundException('El insumo no existe.');
    }

    return insumo;
  }

  async actualizarInsumo(id: number, dto: EditarInsumoDto): Promise<Insumo> {
    const insumo = await this.obtenerInsumo(id);

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
      .andWhere('insumo.id != :id', { id })
      .getOne();

    if (duplicado) {
      throw new ConflictException(
        `Ya existe un insumo llamado "${duplicado.nombre}" en la categoría "${categoria.nombre}".`,
      );
    }

    insumo.nombre = dto.nombre;
    insumo.categoria = categoria;
    insumo.unidadMedida = dto.unidadMedida;
    insumo.nivelMinimo = dto.nivelMinimo;

    try {
      return await this.insumosRepo.save(insumo);
    } catch (error) {
      this.relanzarSiEsDuplicado(
        error,
        `Ya existe un insumo llamado "${dto.nombre}" en la categoría "${categoria.nombre}".`,
      );
      throw error;
    }
  }

  /**
   * Backlog 4.4: registra una entrada y suma la cantidad al stock del insumo.
   *
   * Va en una transacción con bloqueo pesimista sobre la fila del insumo: el
   * movimiento y el nuevo stock tienen que cuajar juntos o no aplicarse, y dos
   * entradas simultáneas sobre el mismo insumo deben sumarse ambas en lugar de
   * pisarse.
   */
  async registrarEntrada(
    dto: RegistrarEntradaDto,
    actor: UsuarioAutenticado,
  ): Promise<MovimientoInventario> {
    return this.dataSource.transaction(async (manager) => {
      // Se usa QueryBuilder a propósito: `findOne` aplicaría el LEFT JOIN de la
      // relación eager `categoria`, y Postgres no admite FOR UPDATE sobre el
      // lado externo de un outer join.
      const insumo = await manager
        .createQueryBuilder(Insumo, 'insumo')
        .setLock('pessimistic_write')
        .where('insumo.id = :id', { id: dto.insumoId })
        .getOne();

      if (!insumo || !insumo.activo) {
        throw new NotFoundException(
          'El insumo seleccionado no existe o está inactivo.',
        );
      }

      // El DTO ya acota la cantidad al rango de numeric(12,2), pero la suma con
      // la existencia actual puede desbordar la columna igual. Se comprueba en
      // céntimos para que la comparación sea exacta y no dependa de la coma
      // flotante; de lo contrario Postgres respondería con un error 22003 y la
      // petición terminaría en un 500.
      const enCentimos = (valor: number) => Math.round(valor * 100);
      if (
        enCentimos(insumo.cantidad) + enCentimos(dto.cantidad) >
        enCentimos(VALOR_MAXIMO)
      ) {
        throw new BadRequestException(
          `La entrada dejaría la existencia por encima del máximo registrable (${VALOR_MAXIMO_TEXTO}).`,
        );
      }

      const movimiento = await manager.save(
        manager.create(MovimientoInventario, {
          insumo,
          tipo: TipoMovimiento.ENTRADA,
          cantidad: dto.cantidad,
          fecha: dto.fecha,
          origen: dto.origen ?? null,
          motivo: null,
          responsableId: actor.id,
        }),
      );

      // La suma se hace en SQL (cantidad = cantidad + :n) para que la aritmética
      // decimal la resuelva Postgres y no el redondeo de coma flotante de JS.
      await manager.increment(
        Insumo,
        { id: insumo.id },
        'cantidad',
        dto.cantidad,
      );

      // Se relee para devolver el insumo con su stock ya actualizado.
      movimiento.insumo = (await manager.findOneBy(Insumo, {
        id: insumo.id,
      })) as Insumo;

      return movimiento;
    });
  }

  /**
   * Backlog 4.5: historial de entradas, paginado y filtrable.
   *
   * Solo devuelve movimientos de tipo ENTRADA. Aprovecha el índice
   * (tipo, fecha) creado en la migración del 4.4.
   */
  async listarEntradas(
    filtros: ConsultarEntradasDto,
  ): Promise<ResultadoPaginado<EntradaRespuesta>> {
    // Se seleccionan solo las columnas necesarias; del responsable se trae
    // únicamente id y nombre, nunca su correo ni el hash de contraseña.
    const consulta = this.movimientosRepo
      .createQueryBuilder('movimiento')
      .innerJoin('movimiento.insumo', 'insumo')
      .innerJoin('movimiento.responsable', 'responsable')
      .select([
        'movimiento.id',
        'movimiento.cantidad',
        'movimiento.fecha',
        'movimiento.origen',
        'movimiento.creadoEn',
        'insumo.id',
        'insumo.nombre',
        'insumo.unidadMedida',
        'responsable.id',
        'responsable.nombre',
      ])
      .where('movimiento.tipo = :tipo', { tipo: TipoMovimiento.ENTRADA })
      // Lo más reciente primero; el id desempata dos movimientos del mismo día.
      .orderBy('movimiento.fecha', 'DESC')
      .addOrderBy('movimiento.id', 'DESC');

    if (filtros.insumoId) {
      consulta.andWhere('movimiento.insumo_id = :insumoId', {
        insumoId: filtros.insumoId,
      });
    }

    if (filtros.desde) {
      consulta.andWhere('movimiento.fecha >= :desde', { desde: filtros.desde });
    }

    if (filtros.hasta) {
      consulta.andWhere('movimiento.fecha <= :hasta', { hasta: filtros.hasta });
    }

    const { entidades, total } = await paginarQueryBuilder(consulta, filtros);

    return crearResultadoPaginado(
      entidades.map((movimiento) => ({
        id: movimiento.id,
        cantidad: movimiento.cantidad,
        fecha: movimiento.fecha,
        origen: movimiento.origen,
        creadoEn: movimiento.creadoEn,
        insumo: {
          id: movimiento.insumo.id,
          nombre: movimiento.insumo.nombre,
          unidadMedida: movimiento.insumo.unidadMedida,
        },
        responsable: {
          id: movimiento.responsable.id,
          nombre: movimiento.responsable.nombre,
        },
      })),
      filtros,
      total,
    );
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
