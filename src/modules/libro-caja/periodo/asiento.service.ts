import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { LibroCajaPolicy } from '../libro-caja.policy';
import { CrearAsientoDto } from './dto/crear-asiento.dto';
import { AsientoCaja } from './entities/asiento-caja.entity';
import { FondoCaja } from './entities/fondo-caja.entity';
import { EstadoFondo } from './enums/estado-fondo.enum';
import { EstadoPeriodo } from './enums/estado-periodo.enum';
import {
  mapearLibroDepartamento,
  type LibroDepartamentoRespuesta,
} from './respuestas/asiento.mapper';

@Injectable()
export class AsientoService {
  constructor(
    @InjectRepository(FondoCaja)
    private readonly fondosRepo: Repository<FondoCaja>,
    @InjectRepository(AsientoCaja)
    private readonly asientosRepo: Repository<AsientoCaja>,
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
      order: { numero: 'ASC' },
    });
    return mapearLibroDepartamento(fondo, asientos);
  }

  async crear(
    periodoId: number,
    fondoId: number,
    dto: CrearAsientoDto,
    actor: UsuarioAutenticado,
  ): Promise<LibroDepartamentoRespuesta> {
    this.policy.exigirRegistroAsiento(actor);

    await this.dataSource.transaction(async (manager) => {
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
      if (fondo.periodo.estado !== EstadoPeriodo.ABIERTO) {
        throw new ConflictException(
          'No se pueden registrar asientos en un periodo cerrado.',
        );
      }
      if (fondo.estado !== EstadoFondo.SOLICITADO) {
        throw new ConflictException(
          'Registre el fondo inicial de este departamento antes de anotar asientos.',
        );
      }
      if (dto.fecha < fondo.periodo.fechaInicio || dto.fecha > fondo.periodo.fechaFin) {
        throw new BadRequestException(
          `La fecha del asiento debe estar entre ${fondo.periodo.fechaInicio} y ${fondo.periodo.fechaFin}.`,
        );
      }

      const fila = await manager
        .createQueryBuilder(AsientoCaja, 'asiento')
        .select('COALESCE(MAX(asiento.numero), 0)', 'ultimo')
        .where('asiento.fondo_id = :fondoId', { fondoId: fondo.id })
        .getRawOne<{ ultimo: string | number }>();
      const numero = Number(fila?.ultimo ?? 0) + 1;

      await manager.save(
        AsientoCaja,
        manager.create(AsientoCaja, {
          fondo,
          numero,
          fecha: dto.fecha,
          numeroFactura: dto.numeroFactura ?? '',
          descripcion: dto.descripcion,
          ingresos: dto.ingresos,
          egresos: dto.egresos,
          creadoPor: actor.id,
        }),
      );
    });

    return this.listar(periodoId, fondoId);
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
