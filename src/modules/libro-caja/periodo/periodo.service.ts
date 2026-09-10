import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  crearResultadoPaginado,
  paginarQueryBuilder,
} from '../../../common/paginacion/helpers/paginar.helper';
import type { ResultadoPaginado } from '../../../common/paginacion/tipos/resultado-paginado';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { DepartamentoCaja } from '../departamento/entities/departamento-caja.entity';
import { LibroCajaPolicy } from '../libro-caja.policy';
import { AbrirPeriodoDto } from './dto/abrir-periodo.dto';
import { EditarPeriodoDto } from './dto/editar-periodo.dto';
import { FiltrarPeriodosDto } from './dto/filtrar-periodos.dto';
import { SolicitarFondoDto } from './dto/solicitar-fondo.dto';
import { FondoCaja } from './entities/fondo-caja.entity';
import { PeriodoCaja } from './entities/periodo-caja.entity';
import { EstadoFondo } from './enums/estado-fondo.enum';
import { EstadoPeriodo } from './enums/estado-periodo.enum';
import {
  mapearFondo,
  mapearPeriodo,
  mapearPeriodoResumen,
  type FondoCajaRespuesta,
  type PeriodoCajaRespuesta,
  type PeriodoCajaResumenRespuesta,
} from './respuestas/periodo.mapper';

@Injectable()
export class PeriodoService {
  constructor(
    @InjectRepository(PeriodoCaja)
    private readonly periodosRepo: Repository<PeriodoCaja>,
    private readonly dataSource: DataSource,
    private readonly policy: LibroCajaPolicy,
  ) {}

  async listar(
    filtros: FiltrarPeriodosDto,
  ): Promise<ResultadoPaginado<PeriodoCajaResumenRespuesta>> {
    const consulta = this.periodosRepo
      .createQueryBuilder('periodo')
      .orderBy('periodo.fechaInicio', 'DESC')
      .addOrderBy('periodo.id', 'DESC');

    if (filtros.estado) {
      consulta.andWhere('periodo.estado = :estado', { estado: filtros.estado });
    }

    if (filtros.q) {
      consulta.andWhere('lower(periodo.nombre) LIKE lower(:q)', {
        q: `%${filtros.q}%`,
      });
    }

    const { entidades, total } = await paginarQueryBuilder(consulta, filtros);
    return crearResultadoPaginado(
      entidades.map(mapearPeriodoResumen),
      filtros,
      total,
    );
  }

  async obtener(id: number): Promise<PeriodoCajaRespuesta> {
    return mapearPeriodo(await this.buscarConFondos(id));
  }

  /**
   * Abre un periodo y registra a mano el fondo de cada departamento activo
   * (saldo que queda de periodos anteriores).
   */
  async abrir(
    dto: AbrirPeriodoDto,
    actor: UsuarioAutenticado,
  ): Promise<PeriodoCajaRespuesta> {
    this.policy.exigirAdministrador(actor);

    const periodo = await this.dataSource.transaction(async (manager) => {
      const abierto = await manager.findOne(PeriodoCaja, {
        where: { estado: EstadoPeriodo.ABIERTO },
      });
      if (abierto) {
        throw new ConflictException(
          `Solo puede haber un periodo abierto a la vez. "${abierto.nombre}" sigue abierto: ciérrelo para poder abrir otro, aunque el nombre sea distinto.`,
        );
      }

      await this.asegurarRangoLibre(manager, dto.fechaInicio, dto.fechaFin);

      const departamentos = await manager.find(DepartamentoCaja, {
        where: { activo: true },
        order: { nombreUnidad: 'ASC', id: 'ASC' },
      });
      if (departamentos.length === 0) {
        throw new BadRequestException(
          'No hay departamentos activos. Cree al menos uno antes de abrir un periodo.',
        );
      }

      const montoPorDepartamento = this.montosPorDepartamentoActivo(
        departamentos,
        dto.fondos,
      );
      const ahora = new Date();

      const creado = await manager.save(
        PeriodoCaja,
        manager.create(PeriodoCaja, {
          nombre: dto.nombre,
          fechaInicio: dto.fechaInicio,
          fechaFin: dto.fechaFin,
          estado: EstadoPeriodo.ABIERTO,
          creadoPor: actor.id,
          actualizadoPor: null,
        }),
      );

      const fondos = departamentos.map((departamento) =>
        manager.create(FondoCaja, {
          periodo: creado,
          departamento,
          montoSolicitado: montoPorDepartamento.get(departamento.id),
          estado: EstadoFondo.SOLICITADO,
          solicitadoEn: ahora,
          solicitadoPor: actor.id,
        }),
      );
      creado.fondos = await manager.save(FondoCaja, fondos);
      return creado;
    });

    return mapearPeriodo(periodo);
  }

  async actualizar(
    id: number,
    dto: EditarPeriodoDto,
    actor: UsuarioAutenticado,
  ): Promise<PeriodoCajaRespuesta> {
    this.policy.exigirAdministrador(actor);

    await this.dataSource.transaction(async (manager) => {
      const periodo = await manager.findOne(PeriodoCaja, { where: { id } });
      if (!periodo) {
        throw new NotFoundException('El periodo no existe.');
      }
      if (periodo.estado !== EstadoPeriodo.ABIERTO) {
        throw new ConflictException(
          'Solo se pueden editar los datos de un periodo abierto.',
        );
      }

      await this.asegurarRangoLibre(manager, dto.fechaInicio, dto.fechaFin, id);

      periodo.nombre = dto.nombre;
      periodo.fechaInicio = dto.fechaInicio;
      periodo.fechaFin = dto.fechaFin;
      periodo.actualizadoPor = actor.id;
      await manager.save(periodo);
    });

    return mapearPeriodo(await this.buscarConFondos(id));
  }

  async cerrar(
    id: number,
    actor: UsuarioAutenticado,
  ): Promise<PeriodoCajaRespuesta> {
    this.policy.exigirAdministrador(actor);

    await this.dataSource.transaction(async (manager) => {
      const periodo = await manager.findOne(PeriodoCaja, { where: { id } });
      if (!periodo) {
        throw new NotFoundException('El periodo no existe.');
      }
      if (periodo.estado !== EstadoPeriodo.ABIERTO) {
        throw new ConflictException('El periodo ya está cerrado.');
      }

      periodo.estado = EstadoPeriodo.CERRADO;
      periodo.actualizadoPor = actor.id;
      await manager.save(periodo);
    });

    return mapearPeriodo(await this.buscarConFondos(id));
  }

  async solicitarFondo(
    periodoId: number,
    fondoId: number,
    dto: SolicitarFondoDto,
    actor: UsuarioAutenticado,
  ): Promise<FondoCajaRespuesta> {
    const fondo = await this.dataSource.transaction(async (manager) => {
      const periodo = await manager.findOne(PeriodoCaja, {
        where: { id: periodoId },
      });
      if (!periodo) {
        throw new NotFoundException('El periodo no existe.');
      }
      if (periodo.estado !== EstadoPeriodo.ABIERTO) {
        throw new ConflictException(
          'No se puede solicitar un fondo en un periodo cerrado.',
        );
      }

      const actual = await manager.findOne(FondoCaja, {
        where: { id: fondoId },
        relations: { departamento: true, periodo: true },
      });
      if (!actual || actual.periodo.id !== periodoId) {
        throw new NotFoundException(
          'El fondo de caja no existe en este periodo.',
        );
      }
      if (actual.estado !== EstadoFondo.PENDIENTE) {
        throw new ConflictException(
          'Este departamento ya solicitó su fondo de caja inicial.',
        );
      }

      this.policy.exigirSolicitudFondo(actor);

      actual.montoSolicitado = dto.montoSolicitado;
      actual.estado = EstadoFondo.SOLICITADO;
      actual.solicitadoEn = new Date();
      actual.solicitadoPor = actor.id;
      return manager.save(actual);
    });

    return mapearFondo(fondo);
  }

  private async buscarConFondos(id: number): Promise<PeriodoCaja> {
    const periodo = await this.periodosRepo
      .createQueryBuilder('periodo')
      .leftJoinAndSelect('periodo.fondos', 'fondo')
      .leftJoinAndSelect('fondo.departamento', 'departamento')
      .where('periodo.id = :id', { id })
      .orderBy('departamento.nombreUnidad', 'ASC')
      .addOrderBy('fondo.id', 'ASC')
      .getOne();

    if (!periodo) {
      throw new NotFoundException('El periodo no existe.');
    }
    return periodo;
  }

  private async asegurarRangoLibre(
    manager: import('typeorm').EntityManager,
    fechaInicio: string,
    fechaFin: string,
    idExcluido?: number,
  ): Promise<void> {
    const consulta = manager
      .createQueryBuilder(PeriodoCaja, 'periodo')
      .where('periodo.fechaInicio <= :fechaFin', { fechaFin })
      .andWhere('periodo.fechaFin >= :fechaInicio', { fechaInicio });

    if (idExcluido !== undefined) {
      consulta.andWhere('periodo.id != :idExcluido', { idExcluido });
    }

    const solapado = await consulta.getOne();
    if (solapado) {
      throw new ConflictException(
        `Las fechas se solapan con el periodo "${solapado.nombre}" (${solapado.fechaInicio} a ${solapado.fechaFin}).`,
      );
    }
  }

  private montosPorDepartamentoActivo(
    departamentos: DepartamentoCaja[],
    fondos: AbrirPeriodoDto['fondos'],
  ): Map<number, number> {
    const idsEnviados = fondos.map((fondo) => fondo.departamentoId);
    const unicos = new Set(idsEnviados);
    if (unicos.size !== idsEnviados.length) {
      throw new BadRequestException(
        'Hay departamentos duplicados en los fondos.',
      );
    }

    const idsActivos = new Set(
      departamentos.map((departamento) => departamento.id),
    );
    const faltantes = departamentos.filter(
      (departamento) => !unicos.has(departamento.id),
    );
    if (faltantes.length > 0) {
      throw new BadRequestException(
        `Debe indicar el fondo de cada departamento activo. Falta: ${faltantes
          .map((departamento) => departamento.nombreUnidad)
          .join(', ')}.`,
      );
    }

    const extra = idsEnviados.find((id) => !idsActivos.has(id));
    if (extra !== undefined) {
      throw new BadRequestException(
        'Hay fondos de departamentos que no están activos o no existen.',
      );
    }

    return new Map(fondos.map((fondo) => [fondo.departamentoId, fondo.monto]));
  }
}
