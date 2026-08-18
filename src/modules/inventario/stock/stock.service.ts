import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  type EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
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
import { Producto } from '../producto/entities/producto.entity';
import { UnidadMedida } from '../producto/enums/unidad-medida.enum';
import {
  mapearConfiguracionStock,
  mapearInventario,
  mapearMovimiento,
  type ConfiguracionStockRespuesta,
  type InventarioRespuesta,
  type MovimientoRespuesta,
} from '../respuestas/inventario.mapper';
import { ConsultarMovimientosDto } from './dto/consultar-movimientos.dto';
import { CrearInventarioDto } from './dto/crear-inventario.dto';
import { EditarInventarioDto } from './dto/editar-inventario.dto';
import { FiltrarInventarioDto } from './dto/filtrar-inventario.dto';
import { VALOR_MAXIMO, VALOR_MAXIMO_TEXTO } from './dto/limites-numericos';
import { RegistrarEntradaDto } from './dto/registrar-entrada.dto';
import { RegistrarSalidaDto } from './dto/registrar-salida.dto';
import { ConfiguracionStock } from './entities/configuracion-stock.entity';
import { IdempotenciaMovimiento } from './entities/idempotencia-movimiento.entity';
import { Inventario } from './entities/inventario.entity';
import { MovimientoStock } from './entities/movimiento-stock.entity';
import { TipoMovimiento } from './enums/tipo-movimiento.enum';
import { StockNotificacionesService } from './stock-notificaciones.service';

const PG_UNIQUE_VIOLATION = '23505';

interface ReservaIdempotencia {
  id: number;
  huella: string;
  movimientoId: number | null;
}

export function crearHuellaMovimiento(
  inventarioId: number,
  tipo: TipoMovimiento,
  dto: RegistrarEntradaDto | RegistrarSalidaDto,
): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        inventarioId,
        tipo,
        cantidad: dto.cantidad,
        fecha: dto.fecha,
        origen: 'origen' in dto ? dto.origen : null,
        motivo: 'motivo' in dto ? dto.motivo : null,
      }),
    )
    .digest('hex');
}

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    @InjectRepository(ConfiguracionStock)
    private readonly configuracionesRepo: Repository<ConfiguracionStock>,
    @InjectRepository(Inventario)
    private readonly inventarioRepo: Repository<Inventario>,
    @InjectRepository(MovimientoStock)
    private readonly movimientosRepo: Repository<MovimientoStock>,
    private readonly dataSource: DataSource,
    private readonly policy: InventarioPolicy,
    private readonly notificaciones: StockNotificacionesService,
  ) {}

  async crearConfiguracion(
    dto: CrearInventarioDto,
    actor: UsuarioAutenticado,
  ): Promise<ConfiguracionStockRespuesta> {
    this.policy.exigirAdministrador(actor);
    try {
      const configuracion = await this.dataSource.transaction(
        async (manager) => {
          const producto = await manager
            .createQueryBuilder(Producto, 'producto')
            .setLock('pessimistic_write')
            .where('producto.id = :id', { id: dto.productoId })
            .andWhere('producto.activo = true')
            .getOne();
          if (!producto) {
            throw new NotFoundException(
              'El producto seleccionado no existe o está inactivo.',
            );
          }
          this.validarEntero(producto, dto.stockMinimo, 'El stock mínimo');

          const existente = await manager.findOne(ConfiguracionStock, {
            where: { producto: { id: producto.id } },
          });
          if (existente) this.lanzarConfiguracionDuplicada();

          const creada = await manager.save(
            manager.create(ConfiguracionStock, {
              producto,
              stockMinimo: dto.stockMinimo,
              precio: dto.precio,
              activo: true,
              creadoPor: actor.id,
              actualizadoPor: null,
            }),
          );
          await manager.save(
            manager.create(Inventario, {
              producto,
              cantidadActual: 0,
              activo: true,
            }),
          );
          await manager.save(
            manager.create(AuditoriaInventario, {
              accion: AccionAuditoriaInventario.CREAR,
              recurso: RecursoAuditoriaInventario.CONFIGURACION_STOCK,
              recursoId: creada.id,
              actorId: actor.id,
              datos: {
                productoId: producto.id,
                stockMinimo: creada.stockMinimo,
                precio: creada.precio,
                activo: creada.activo,
              },
            }),
          );
          return creada;
        },
      );
      return mapearConfiguracionStock(configuracion);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
      ) {
        this.lanzarConfiguracionDuplicada();
      }
      throw error;
    }
  }

  async obtenerConfiguracion(
    id: number,
    actor: UsuarioAutenticado,
  ): Promise<ConfiguracionStockRespuesta> {
    const configuracion = await this.configuracionesRepo.findOne({
      where: { id },
    });
    if (!configuracion) {
      throw new NotFoundException('La configuración de stock no existe.');
    }
    this.policy.exigirLectura(actor, configuracion.producto.departamento);
    return mapearConfiguracionStock(configuracion);
  }

  async actualizarConfiguracion(
    id: number,
    dto: EditarInventarioDto,
    actor: UsuarioAutenticado,
  ): Promise<ConfiguracionStockRespuesta> {
    this.policy.exigirAdministrador(actor);
    if (
      dto.stockMinimo === undefined &&
      dto.precio === undefined &&
      dto.activo === undefined
    ) {
      throw new BadRequestException(
        'Indique al menos un campo para actualizar.',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const configuracion = await manager
        .createQueryBuilder(ConfiguracionStock, 'configuracion')
        .innerJoinAndSelect('configuracion.producto', 'producto')
        .setLock('pessimistic_write')
        .where('configuracion.id = :id', { id })
        .getOne();
      if (!configuracion) {
        throw new NotFoundException('La configuración de stock no existe.');
      }
      if (!configuracion.producto.activo) {
        throw new BadRequestException('El producto está inactivo.');
      }
      const anterior = {
        stockMinimo: configuracion.stockMinimo,
        precio: configuracion.precio,
        activo: configuracion.activo,
      };
      if (dto.stockMinimo !== undefined) {
        this.validarEntero(
          configuracion.producto,
          dto.stockMinimo,
          'El stock mínimo',
        );
        configuracion.stockMinimo = dto.stockMinimo;
      }
      if (dto.precio !== undefined) configuracion.precio = dto.precio;
      if (dto.activo !== undefined) configuracion.activo = dto.activo;
      configuracion.actualizadoPor = actor.id;
      await manager.save(configuracion);
      await manager.save(
        manager.create(AuditoriaInventario, {
          accion: AccionAuditoriaInventario.EDITAR,
          recurso: RecursoAuditoriaInventario.CONFIGURACION_STOCK,
          recursoId: configuracion.id,
          actorId: actor.id,
          datos: {
            anterior,
            nuevo: {
              stockMinimo: configuracion.stockMinimo,
              precio: configuracion.precio,
              activo: configuracion.activo,
            },
          },
        }),
      );
    });
    return this.obtenerConfiguracion(id, actor);
  }

  async listarExistencias(
    filtros: FiltrarInventarioDto,
    actor: UsuarioAutenticado,
  ): Promise<ResultadoPaginado<InventarioRespuesta>> {
    const consulta = this.inventarioRepo
      .createQueryBuilder('inventario')
      .innerJoinAndSelect('inventario.producto', 'producto')
      .where('inventario.activo = true')
      .andWhere('producto.activo = true')
      .orderBy('producto.nombre', 'ASC')
      .addOrderBy('inventario.id', 'ASC');
    if (filtros.productoId) {
      consulta.andWhere('inventario.producto_id = :productoId', {
        productoId: filtros.productoId,
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
    const { entidades, total } = await paginarQueryBuilder(consulta, filtros);
    return crearResultadoPaginado(
      entidades.map(mapearInventario),
      filtros,
      total,
    );
  }

  async obtenerExistencia(
    id: number,
    actor: UsuarioAutenticado,
  ): Promise<InventarioRespuesta> {
    const inventario = await this.buscarInventario(id);
    this.policy.exigirLectura(actor, inventario.producto.departamento);
    return mapearInventario(inventario);
  }

  registrarEntrada(
    id: number,
    dto: RegistrarEntradaDto,
    actor: UsuarioAutenticado,
    clave: string,
  ): Promise<MovimientoRespuesta> {
    return this.registrarMovimiento(
      id,
      TipoMovimiento.ENTRADA,
      dto,
      actor,
      clave,
    );
  }

  registrarSalida(
    id: number,
    dto: RegistrarSalidaDto,
    actor: UsuarioAutenticado,
    clave: string,
  ): Promise<MovimientoRespuesta> {
    return this.registrarMovimiento(
      id,
      TipoMovimiento.SALIDA,
      dto,
      actor,
      clave,
    );
  }

  async listarMovimientos(
    filtros: ConsultarMovimientosDto,
    actor: UsuarioAutenticado,
  ): Promise<ResultadoPaginado<MovimientoRespuesta>> {
    const consulta = this.movimientosRepo
      .createQueryBuilder('movimiento')
      .innerJoinAndSelect('movimiento.inventario', 'inventario')
      .innerJoinAndSelect('inventario.producto', 'producto')
      .leftJoinAndSelect('movimiento.responsable', 'responsable')
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
    if (filtros.tipo) {
      consulta.andWhere('movimiento.tipo = :tipo', { tipo: filtros.tipo });
    }
    const departamentoPermitido = this.policy.limitarDepartamento(actor);
    if (departamentoPermitido) {
      consulta.andWhere(
        'movimiento.departamento_snapshot = :departamentoPermitido',
        { departamentoPermitido },
      );
    }
    const { entidades, total } = await paginarQueryBuilder(consulta, filtros);
    return crearResultadoPaginado(
      entidades.map(mapearMovimiento),
      filtros,
      total,
    );
  }

  private async registrarMovimiento(
    id: number,
    tipo: TipoMovimiento.ENTRADA | TipoMovimiento.SALIDA,
    dto: RegistrarEntradaDto | RegistrarSalidaDto,
    actor: UsuarioAutenticado,
    clave: string,
  ): Promise<MovimientoRespuesta> {
    const huella = crearHuellaMovimiento(id, tipo, dto);
    let avisoStockBajo: {
      productoNombre: string;
      unidadMedida: string;
      cantidadActual: number;
      stockMinimo: number;
    } | null = null;

    const resultado = await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .insert()
        .into(IdempotenciaMovimiento)
        .values({
          responsableId: actor.id,
          clave,
          huella,
          movimientoId: null,
        })
        .orIgnore()
        .execute();
      const reserva = await manager
        .createQueryBuilder(IdempotenciaMovimiento, 'reserva')
        .setLock('pessimistic_write')
        .where('reserva.responsable_id = :responsableId', {
          responsableId: actor.id,
        })
        .andWhere('reserva.clave = :clave', { clave })
        .getOne();
      if (!reserva) {
        throw new ConflictException(
          'No se pudo reservar la clave idempotente.',
        );
      }
      const datosReserva: ReservaIdempotencia = {
        id: reserva.id,
        huella: reserva.huella,
        movimientoId: reserva.movimientoId,
      };
      if (datosReserva.huella !== huella) {
        throw new ConflictException(
          'La clave Idempotency-Key ya fue usada con otra solicitud.',
        );
      }
      if (datosReserva.movimientoId) {
        return mapearMovimiento(
          await this.buscarMovimiento(manager, datosReserva.movimientoId),
        );
      }

      const inventario = await manager
        .createQueryBuilder(Inventario, 'inventario')
        .innerJoinAndSelect('inventario.producto', 'producto')
        .innerJoinAndSelect('producto.configuracionStock', 'configuracionStock')
        .setLock('pessimistic_write')
        .where('inventario.id = :id', { id })
        .getOne();
      if (
        !inventario ||
        !inventario.activo ||
        !inventario.producto.activo ||
        !inventario.producto.configuracionStock?.activo
      ) {
        throw new NotFoundException(
          'El producto, su configuración o su inventario no existe o está inactivo.',
        );
      }
      this.policy.exigirMovimiento(actor, inventario.producto.departamento);
      this.validarEntero(inventario.producto, dto.cantidad, 'La cantidad');
      this.validarSaldo(tipo, inventario.cantidadActual, dto.cantidad);

      const configuracion = inventario.producto.configuracionStock;
      const cantidadAnterior = inventario.cantidadActual;
      const cantidadNueva =
        tipo === TipoMovimiento.ENTRADA
          ? cantidadAnterior + dto.cantidad
          : cantidadAnterior - dto.cantidad;
      if (
        cantidadNueva <= configuracion.stockMinimo &&
        cantidadAnterior > configuracion.stockMinimo
      ) {
        avisoStockBajo = {
          productoNombre: inventario.producto.nombre,
          unidadMedida: inventario.producto.unidadMedida,
          cantidadActual: cantidadNueva,
          stockMinimo: configuracion.stockMinimo,
        };
      }

      const movimiento = await manager.save(
        manager.create(MovimientoStock, {
          inventario,
          tipo,
          cantidad: dto.cantidad,
          fecha: dto.fecha,
          origen: 'origen' in dto ? dto.origen : null,
          motivo: 'motivo' in dto ? dto.motivo : null,
          productoNombre: inventario.producto.nombre,
          unidadMedida: inventario.producto.unidadMedida,
          departamento: inventario.producto.departamento,
          precioUnitario: configuracion.precio,
          responsableId: actor.id,
        }),
      );
      await manager.update(IdempotenciaMovimiento, reserva.id, {
        movimientoId: movimiento.id,
      });
      return mapearMovimiento(
        await this.buscarMovimiento(manager, movimiento.id),
      );
    });

    if (avisoStockBajo) {
      await this.notificaciones
        .notificarStockBajo(avisoStockBajo)
        .catch((error: unknown) =>
          this.logger.error(
            `Falló el envío de la notificación de stock bajo: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
    }
    return resultado;
  }

  private async buscarInventario(id: number): Promise<Inventario> {
    const inventario = await this.inventarioRepo
      .createQueryBuilder('inventario')
      .innerJoinAndSelect('inventario.producto', 'producto')
      .where('inventario.id = :id', { id })
      .andWhere('inventario.activo = true')
      .andWhere('producto.activo = true')
      .getOne();
    if (!inventario) {
      throw new NotFoundException('La existencia no existe o está inactiva.');
    }
    return inventario;
  }

  private async buscarMovimiento(
    manager: EntityManager,
    id: number,
  ): Promise<MovimientoStock> {
    const movimiento = await manager
      .createQueryBuilder(MovimientoStock, 'movimiento')
      .innerJoinAndSelect('movimiento.inventario', 'inventario')
      .innerJoinAndSelect('inventario.producto', 'producto')
      .leftJoinAndSelect('movimiento.responsable', 'responsable')
      .where('movimiento.id = :id', { id })
      .getOne();
    if (!movimiento) {
      throw new ConflictException(
        'La reserva idempotente no referencia un movimiento válido.',
      );
    }
    return movimiento;
  }

  private validarSaldo(
    tipo: TipoMovimiento.ENTRADA | TipoMovimiento.SALIDA,
    actual: number,
    cantidad: number,
  ): void {
    const centimos = (valor: number) => Math.round(valor * 100);
    if (
      tipo === TipoMovimiento.ENTRADA &&
      centimos(actual) + centimos(cantidad) > centimos(VALOR_MAXIMO)
    ) {
      throw new BadRequestException(
        `La entrada dejaría la existencia por encima del máximo registrable (${VALOR_MAXIMO_TEXTO}).`,
      );
    }
    if (
      tipo === TipoMovimiento.SALIDA &&
      centimos(cantidad) > centimos(actual)
    ) {
      throw new BadRequestException(
        'La salida dejaría la existencia en negativo.',
      );
    }
  }

  private validarEntero(
    producto: Producto,
    valor: number,
    etiqueta: string,
  ): void {
    if (
      producto.unidadMedida === UnidadMedida.UNIDAD &&
      !Number.isInteger(valor)
    ) {
      throw new BadRequestException(
        `${etiqueta} debe ser un número entero para productos por unidad.`,
      );
    }
  }

  private lanzarConfiguracionDuplicada(): never {
    throw new ConflictException(
      'El producto ya tiene una configuración de stock.',
    );
  }
}
