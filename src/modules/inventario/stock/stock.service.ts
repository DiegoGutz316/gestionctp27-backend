import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { Producto } from '../producto/entities/producto.entity';
import { UnidadMedida } from '../producto/enums/unidad-medida.enum';
import { Inventario } from './entities/inventario.entity';
import { MovimientoStock } from './entities/movimiento-stock.entity';
import { TipoMovimiento } from './enums/tipo-movimiento.enum';
import { CrearInventarioDto } from './dto/crear-inventario.dto';
import { EditarInventarioDto } from './dto/editar-inventario.dto';
import { FiltrarInventarioDto } from './dto/filtrar-inventario.dto';
import { RegistrarEntradaDto } from './dto/registrar-entrada.dto';
import { RegistrarSalidaDto } from './dto/registrar-salida.dto';
import { ConsultarMovimientosDto } from './dto/consultar-movimientos.dto';
import { VALOR_MAXIMO, VALOR_MAXIMO_TEXTO } from './dto/limites-numericos';
import {
  crearResultadoPaginado,
  paginarQueryBuilder,
} from '../../../common/paginacion/helpers/paginar.helper';
import type { ResultadoPaginado } from '../../../common/paginacion/tipos/resultado-paginado';

const PG_UNIQUE_VIOLATION = '23505';

/** Forma de una fila del historial de movimientos (endpoint de listado). */
export interface MovimientoRespuesta {
  id: number;
  tipo: TipoMovimiento;
  cantidad: number;
  fecha: string;
  origen: string | null;
  motivo: string | null;
  creadoEn: Date;
  inventario: {
    id: number;
    producto: { id: number; nombre: string; unidadMedida: UnidadMedida };
  };
  responsable: { id: string; nombre: string };
}

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Producto)
    private readonly productosRepo: Repository<Producto>,
    @InjectRepository(Inventario)
    private readonly inventarioRepo: Repository<Inventario>,
    @InjectRepository(MovimientoStock)
    private readonly movimientosRepo: Repository<MovimientoStock>,
    private readonly dataSource: DataSource,
  ) {}

  listar(filtros: FiltrarInventarioDto = {}): Promise<Inventario[]> {
    // QueryBuilder no aplica relaciones eager automáticamente (a diferencia
    // de repo.find()); se hace el join explícito para incluir el producto.
    const consulta = this.inventarioRepo
      .createQueryBuilder('inventario')
      .leftJoinAndSelect('inventario.producto', 'producto')
      .where('inventario.activo = true')
      .orderBy('producto.nombre', 'ASC');

    if (filtros.productoId) {
      consulta.andWhere('inventario.producto_id = :productoId', {
        productoId: filtros.productoId,
      });
    }

    return consulta.getMany();
  }

  // La configuración nace con existencia 0; la cantidad no forma parte del
  // DTO y solo puede cambiar al insertar entradas/salidas.
  async crear(dto: CrearInventarioDto): Promise<Inventario> {
    const producto = await this.productosRepo.findOneBy({
      id: dto.productoId,
      activo: true,
    });

    if (!producto) {
      throw new NotFoundException(
        'El producto seleccionado no existe o está inactivo.',
      );
    }

    const existente = await this.inventarioRepo.findOne({
      where: { producto: { id: producto.id } },
    });

    if (existente) {
      throw new ConflictException(
        'El producto ya tiene una configuración de stock.',
      );
    }

    const inventario = this.inventarioRepo.create({
      producto,
      cantidad: 0,
      stockMinimo: dto.stockMinimo,
      precio: dto.precio,
    });

    try {
      return await this.inventarioRepo.save(inventario);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          'El producto ya tiene una configuración de stock.',
        );
      }
      throw error;
    }
  }

  async obtener(id: number): Promise<Inventario> {
    const inventario = await this.inventarioRepo.findOne({
      where: { id, activo: true },
    });

    if (!inventario) {
      throw new NotFoundException('El registro de inventario no existe.');
    }

    return inventario;
  }

  async actualizar(id: number, dto: EditarInventarioDto): Promise<Inventario> {
    const inventario = await this.obtener(id);

    inventario.stockMinimo = dto.stockMinimo;
    inventario.precio = dto.precio;

    return this.inventarioRepo.save(inventario);
  }

  /**
   * Registra una entrada y suma la cantidad al stock. Va en una transacción
   * con bloqueo pesimista sobre la fila de inventario: el movimiento y el
   * nuevo stock tienen que cuajar juntos, y dos entradas simultáneas sobre el
   * mismo registro deben sumarse ambas en lugar de pisarse.
   */
  async registrarEntrada(
    id: number,
    dto: RegistrarEntradaDto,
    actor: UsuarioAutenticado,
  ): Promise<MovimientoStock> {
    const actual = await this.obtener(id);
    this.validarCantidadSegunUnidad(actual.producto, dto.cantidad);

    return this.dataSource.transaction(async (manager) => {
      // Se usa QueryBuilder a propósito: `findOne` aplicaría el LEFT JOIN de
      // la relación eager `producto`, y Postgres no admite FOR UPDATE sobre
      // el lado externo de un outer join.
      const inventario = await manager
        .createQueryBuilder(Inventario, 'inventario')
        .setLock('pessimistic_write')
        .where('inventario.id = :id', { id })
        .getOne();

      if (!inventario || !inventario.activo) {
        throw new NotFoundException(
          'El registro de inventario no existe o está inactivo.',
        );
      }

      const enCentimos = (valor: number) => Math.round(valor * 100);
      if (
        enCentimos(inventario.cantidad) + enCentimos(dto.cantidad) >
        enCentimos(VALOR_MAXIMO)
      ) {
        throw new BadRequestException(
          `La entrada dejaría la existencia por encima del máximo registrable (${VALOR_MAXIMO_TEXTO}).`,
        );
      }

      const movimiento = await manager.save(
        manager.create(MovimientoStock, {
          inventario,
          tipo: TipoMovimiento.ENTRADA,
          cantidad: dto.cantidad,
          fecha: dto.fecha,
          origen: dto.origen ?? null,
          responsableId: actor.id,
        }),
      );

      // El trigger de movimientos_stock aplica el cambio. Dejar la lógica en
      // la BD garantiza que tampoco pueda omitirse desde otro consumidor.
      movimiento.inventario = (await manager.findOneBy(Inventario, {
        id: inventario.id,
      })) as Inventario;

      return movimiento;
    });
  }

  /**
   * Registra una salida y resta la cantidad al stock. Mismo patrón
   * transaccional que `registrarEntrada`, pero valida que la existencia no
   * quede negativa.
   */
  async registrarSalida(
    id: number,
    dto: RegistrarSalidaDto,
    actor: UsuarioAutenticado,
  ): Promise<MovimientoStock> {
    const actual = await this.obtener(id);
    this.validarCantidadSegunUnidad(actual.producto, dto.cantidad);

    return this.dataSource.transaction(async (manager) => {
      const inventario = await manager
        .createQueryBuilder(Inventario, 'inventario')
        .setLock('pessimistic_write')
        .where('inventario.id = :id', { id })
        .getOne();

      if (!inventario || !inventario.activo) {
        throw new NotFoundException(
          'El registro de inventario no existe o está inactivo.',
        );
      }

      const enCentimos = (valor: number) => Math.round(valor * 100);
      if (enCentimos(dto.cantidad) > enCentimos(inventario.cantidad)) {
        throw new BadRequestException(
          'La salida dejaría la existencia en negativo.',
        );
      }

      const movimiento = await manager.save(
        manager.create(MovimientoStock, {
          inventario,
          tipo: TipoMovimiento.SALIDA,
          cantidad: dto.cantidad,
          fecha: dto.fecha,
          motivo: dto.motivo ?? null,
          responsableId: actor.id,
        }),
      );

      // El trigger de movimientos_stock aplica la salida en la misma
      // transacción y protege la existencia contra escrituras directas.
      movimiento.inventario = (await manager.findOneBy(Inventario, {
        id: inventario.id,
      })) as Inventario;

      return movimiento;
    });
  }

  /** Historial de movimientos, paginado y filtrable por registro/fechas. */
  async listarMovimientos(
    filtros: ConsultarMovimientosDto,
  ): Promise<ResultadoPaginado<MovimientoRespuesta>> {
    const consulta = this.movimientosRepo
      .createQueryBuilder('movimiento')
      .innerJoin('movimiento.inventario', 'inventario')
      .innerJoin('inventario.producto', 'producto')
      .innerJoin('movimiento.responsable', 'responsable')
      .select([
        'movimiento.id',
        'movimiento.tipo',
        'movimiento.cantidad',
        'movimiento.fecha',
        'movimiento.origen',
        'movimiento.motivo',
        'movimiento.creadoEn',
        'inventario.id',
        'producto.id',
        'producto.nombre',
        'producto.unidadMedida',
        'responsable.id',
        'responsable.nombre',
      ])
      .orderBy('movimiento.fecha', 'DESC')
      .addOrderBy('movimiento.id', 'DESC');

    if (filtros.inventarioId) {
      consulta.andWhere('movimiento.inventario_id = :inventarioId', {
        inventarioId: filtros.inventarioId,
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
        tipo: movimiento.tipo,
        cantidad: movimiento.cantidad,
        fecha: movimiento.fecha,
        origen: movimiento.origen,
        motivo: movimiento.motivo,
        creadoEn: movimiento.creadoEn,
        inventario: {
          id: movimiento.inventario.id,
          producto: {
            id: movimiento.inventario.producto.id,
            nombre: movimiento.inventario.producto.nombre,
            unidadMedida: movimiento.inventario.producto.unidadMedida,
          },
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

  private validarCantidadSegunUnidad(
    producto: Producto,
    cantidad: number,
  ): void {
    if (
      producto.unidadMedida === UnidadMedida.UNIDAD &&
      !Number.isInteger(cantidad)
    ) {
      throw new BadRequestException(
        'La cantidad debe ser un número entero para productos por unidad.',
      );
    }
  }
}
