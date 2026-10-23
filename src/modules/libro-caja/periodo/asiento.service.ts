import { createHash } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { LibroCajaPolicy } from '../libro-caja.policy';
import { CrearAsientoDto } from './dto/crear-asiento.dto';
import { AsientoCaja } from './entities/asiento-caja.entity';
import { FondoCaja } from './entities/fondo-caja.entity';
import { IdempotenciaAsiento } from './entities/idempotencia-asiento.entity';
import { EstadoFondo } from './enums/estado-fondo.enum';
import { EstadoPeriodo } from './enums/estado-periodo.enum';
import {
  mapearLibroDepartamento,
  type LibroDepartamentoRespuesta,
} from './respuestas/asiento.mapper';

const PG_UNIQUE_VIOLATION = '23505';

type OperacionAsiento = 'registrar' | 'corregir' | 'anular';

export const MENSAJE_CLAVE_OTRA_SOLICITUD =
  'La clave Idempotency-Key ya fue usada con otra solicitud.';

export const MENSAJE_CLAVE_ANULADA =
  'La clave Idempotency-Key corresponde a un asiento que ya fue anulado. Si estos datos son otro movimiento, envíelo otra vez.';

@Injectable()
export class AsientoService {
  constructor(
    @InjectRepository(FondoCaja)
    private readonly fondosRepo: Repository<FondoCaja>,
    @InjectRepository(AsientoCaja)
    private readonly asientosRepo: Repository<AsientoCaja>,
    @InjectRepository(IdempotenciaAsiento)
    private readonly idempotenciaRepo: Repository<IdempotenciaAsiento>,
    private readonly dataSource: DataSource,
    private readonly policy: LibroCajaPolicy,
  ) {}

  async listar(
    periodoId: number,
    fondoId: number,
  ): Promise<LibroDepartamentoRespuesta> {
    const fondo = await this.buscarFondoDelPeriodo(periodoId, fondoId);
    const asientos = await this.asientosRepo.find({
      where: { fondo: { id: fondo.id } },
      order: { fecha: 'ASC', numero: 'ASC', id: 'ASC' },
    });
    return mapearLibroDepartamento(fondo, asientos);
  }

  async crear(
    periodoId: number,
    fondoId: number,
    dto: CrearAsientoDto,
    actor: UsuarioAutenticado,
    clave: string,
  ): Promise<LibroDepartamentoRespuesta> {
    this.policy.exigirRegistroAsiento(actor);
    const huella = huellaAsiento(periodoId, fondoId, dto);

    try {
      await this.dataSource.transaction(async (manager) => {
        const previa = await manager.findOne(IdempotenciaAsiento, {
          where: { responsableId: actor.id, clave },
        });
        if (previa) {
          await this.exigirClaveReutilizable(manager, previa, huella);
          return;
        }

        const fondo = await this.bloquearFondo(manager, periodoId, fondoId);
        this.exigirLibroAbierto(fondo);
        this.exigirFechaEnPeriodo(dto.fecha, fondo);

        const existentes = await manager.find(AsientoCaja, {
          where: { fondo: { id: fondo.id } },
        });
        const nuevo = manager.create(AsientoCaja, {
          fondo,
          numero: 1,
          fecha: dto.fecha,
          numeroFactura: dto.numeroFactura ?? '',
          descripcion: dto.descripcion,
          ingresos: dto.ingresos,
          egresos: dto.egresos,
          creadoPor: actor.id,
        });
        const guardados = await this.guardarEnOrden(
          manager,
          fondo.montoSolicitado ?? 0,
          [...existentes, nuevo],
          'registrar',
        );
        const creado = guardados.find(
          (asiento) =>
            asiento.fecha === dto.fecha &&
            asiento.descripcion === dto.descripcion &&
            asiento.ingresos === dto.ingresos &&
            asiento.egresos === dto.egresos &&
            !existentes.some((previo) => previo.id === asiento.id),
        );
        if (!creado?.id) {
          throw new ConflictException(
            'No se pudo confirmar el asiento registrado.',
          );
        }
        await manager.save(
          IdempotenciaAsiento,
          manager.create(IdempotenciaAsiento, {
            responsableId: actor.id,
            clave,
            huella,
            asientoId: creado.id,
          }),
        );
      });
    } catch (error) {
      if (esClaveDuplicada(error)) {
        const repetida = await this.idempotenciaRepo.findOne({
          where: { responsableId: actor.id, clave },
        });
        if (!repetida) {
          throw new ConflictException(MENSAJE_CLAVE_OTRA_SOLICITUD);
        }
        await this.exigirClaveReutilizable(
          this.asientosRepo.manager,
          repetida,
          huella,
        );
        return this.listar(periodoId, fondoId);
      }
      throw error;
    }

    return this.listar(periodoId, fondoId);
  }

  async actualizar(
    periodoId: number,
    fondoId: number,
    asientoId: number,
    dto: CrearAsientoDto,
    actor: UsuarioAutenticado,
  ): Promise<LibroDepartamentoRespuesta> {
    this.policy.exigirRegistroAsiento(actor);

    await this.dataSource.transaction(async (manager) => {
      const fondo = await this.bloquearFondo(manager, periodoId, fondoId);
      this.exigirLibroAbierto(fondo);
      this.exigirFechaEnPeriodo(dto.fecha, fondo);

      const existentes = await manager.find(AsientoCaja, {
        where: { fondo: { id: fondo.id } },
      });
      const actual = existentes.find((asiento) => asiento.id === asientoId);
      if (!actual) {
        throw new NotFoundException('El asiento no existe en este libro.');
      }

      actual.fecha = dto.fecha;
      actual.numeroFactura = dto.numeroFactura ?? '';
      actual.descripcion = dto.descripcion;
      actual.ingresos = dto.ingresos;
      actual.egresos = dto.egresos;
      await this.guardarEnOrden(
        manager,
        fondo.montoSolicitado ?? 0,
        existentes,
        'corregir',
      );
    });

    return this.listar(periodoId, fondoId);
  }

  async eliminar(
    periodoId: number,
    fondoId: number,
    asientoId: number,
    actor: UsuarioAutenticado,
  ): Promise<LibroDepartamentoRespuesta> {
    this.policy.exigirRegistroAsiento(actor);

    await this.dataSource.transaction(async (manager) => {
      const fondo = await this.bloquearFondo(manager, periodoId, fondoId);
      this.exigirLibroAbierto(fondo);

      const existentes = await manager.find(AsientoCaja, {
        where: { fondo: { id: fondo.id } },
      });
      const actual = existentes.find((asiento) => asiento.id === asientoId);
      if (!actual) {
        throw new NotFoundException('El asiento no existe en este libro.');
      }

      await manager
        .createQueryBuilder()
        .update(IdempotenciaAsiento)
        .set({ asientoId: null })
        .where('asiento_id = :id', { id: actual.id })
        .execute();
      await manager.delete(AsientoCaja, actual.id);
      await this.guardarEnOrden(
        manager,
        fondo.montoSolicitado ?? 0,
        existentes.filter((asiento) => asiento.id !== actual.id),
        'anular',
      );
    });

    return this.listar(periodoId, fondoId);
  }

  /**
   * La clave solo se reutiliza si el asiento sigue en el libro.
   * Si se anuló, el cliente debe enviar otra clave: reutilizarla no recrea
   * el movimiento ni finge un alta.
   */
  private async exigirClaveReutilizable(
    manager: Pick<import('typeorm').EntityManager, 'findOne'>,
    previa: IdempotenciaAsiento,
    huella: string,
  ): Promise<void> {
    if (previa.huella !== huella) {
      throw new ConflictException(MENSAJE_CLAVE_OTRA_SOLICITUD);
    }
    if (!previa.asientoId) {
      throw new ConflictException(MENSAJE_CLAVE_ANULADA);
    }
    const vivo = await manager.findOne(AsientoCaja, {
      where: { id: previa.asientoId },
    });
    if (!vivo) {
      throw new ConflictException(MENSAJE_CLAVE_ANULADA);
    }
  }

  private async bloquearFondo(
    manager: import('typeorm').EntityManager,
    periodoId: number,
    fondoId: number,
  ): Promise<FondoCaja> {
    const fondo = await manager.findOne(FondoCaja, {
      where: { id: fondoId },
      relations: { periodo: true, departamento: true },
      lock: { mode: 'pessimistic_write' },
    });
    if (!fondo || fondo.periodo.id !== periodoId) {
      throw new NotFoundException(
        'El fondo de caja no existe en este periodo.',
      );
    }
    return fondo;
  }

  private exigirLibroAbierto(fondo: FondoCaja): void {
    if (fondo.periodo.estado !== EstadoPeriodo.ABIERTO) {
      throw new ConflictException(
        'No se pueden modificar asientos de un periodo cerrado.',
      );
    }
    if (fondo.estado !== EstadoFondo.SOLICITADO) {
      throw new ConflictException(
        'Registre el fondo inicial de este departamento antes de anotar asientos.',
      );
    }
  }

  private exigirFechaEnPeriodo(fecha: string, fondo: FondoCaja): void {
    if (fecha < fondo.periodo.fechaInicio || fecha > fondo.periodo.fechaFin) {
      throw new BadRequestException(
        `La fecha del asiento debe estar entre ${fondo.periodo.fechaInicio} y ${fondo.periodo.fechaFin}.`,
      );
    }
  }

  /**
   * Ordena por fecha y reasigna el número de asiento. El saldo se valida
   * en ese orden para que un egreso no deje el libro en negativo.
   */
  private async guardarEnOrden(
    manager: import('typeorm').EntityManager,
    fondoInicial: number,
    asientos: AsientoCaja[],
    operacion: OperacionAsiento,
  ): Promise<AsientoCaja[]> {
    const ordenados = [...asientos].sort(compararAsientos);
    exigirSaldoNoNegativo(fondoInicial, ordenados, operacion);
    if (ordenados.length === 0) return [];

    ordenados.forEach((asiento, indice) => {
      asiento.numero = 1_000_000 + indice + 1;
    });
    const guardados = await manager.save(AsientoCaja, ordenados);
    const finales = [...guardados].sort(compararAsientos);
    finales.forEach((asiento, indice) => {
      asiento.numero = indice + 1;
    });
    return manager.save(AsientoCaja, finales);
  }

  private async buscarFondoDelPeriodo(
    periodoId: number,
    fondoId: number,
  ): Promise<FondoCaja> {
    const fondo = await this.fondosRepo.findOne({
      where: { id: fondoId },
      relations: { periodo: true, departamento: true },
    });
    if (!fondo || fondo.periodo.id !== periodoId) {
      throw new NotFoundException(
        'El fondo de caja no existe en este periodo.',
      );
    }
    return fondo;
  }
}

function compararAsientos(a: AsientoCaja, b: AsientoCaja): number {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
  return (a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER);
}

function redondearColones(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function exigirSaldoNoNegativo(
  fondoInicial: number,
  asientos: AsientoCaja[],
  operacion: OperacionAsiento,
): void {
  let saldo = redondearColones(fondoInicial);
  for (const asiento of asientos) {
    saldo = redondearColones(saldo + asiento.ingresos - asiento.egresos);
    if (saldo < 0) {
      throw new BadRequestException(mensajeSaldoNegativo(operacion));
    }
  }
}

function mensajeSaldoNegativo(operacion: OperacionAsiento): string {
  if (operacion === 'corregir') {
    return 'Esa corrección deja el saldo del libro en negativo. Revise el monto o la fecha.';
  }
  if (operacion === 'anular') {
    return 'Anular ese asiento deja el saldo del libro en negativo.';
  }
  return 'Ese egreso deja el saldo del libro en negativo. Revise el monto o el orden de las fechas.';
}

function huellaAsiento(
  periodoId: number,
  fondoId: number,
  dto: CrearAsientoDto,
): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        periodoId,
        fondoId,
        fecha: dto.fecha,
        numeroFactura: dto.numeroFactura ?? '',
        descripcion: dto.descripcion,
        ingresos: dto.ingresos,
        egresos: dto.egresos,
      }),
    )
    .digest('hex');
}

function esClaveDuplicada(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION &&
    (error.driverError as { constraint?: string })?.constraint ===
      'uq_idempotencia_asiento_responsable_clave'
  );
}
