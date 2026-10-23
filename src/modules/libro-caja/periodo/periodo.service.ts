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
import { DepartamentoCaja } from '../departamento/entities/departamento-caja.entity';
import { LibroCajaPolicy } from '../libro-caja.policy';
import { AbrirPeriodoDto } from './dto/abrir-periodo.dto';
import { EditarPeriodoDto } from './dto/editar-periodo.dto';
import { FiltrarPeriodosDto } from './dto/filtrar-periodos.dto';
import { GuardarPieInformeDto } from './dto/guardar-pie-informe.dto';
import { SolicitarFondoDto } from './dto/solicitar-fondo.dto';
import { AsientoCaja } from './entities/asiento-caja.entity';
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

const PG_UNIQUE_VIOLATION = '23505';

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
    await this.incorporarDepartamentosActivos(id);
    return mapearPeriodo(await this.buscarConFondos(id));
  }

  /**
   * Un departamento creado después de abrir el periodo no trae fondo.
   * Al consultar el periodo abierto se le crea uno pendiente, para que
   * aparezca en la lista y se pueda solicitar el monto inicial.
   */
  private async incorporarDepartamentosActivos(id: number): Promise<void> {
    const periodo = await this.periodosRepo.findOne({ where: { id } });
    if (!periodo || periodo.estado !== EstadoPeriodo.ABIERTO) return;

    try {
      await this.dataSource.transaction(async (manager) => {
        const departamentos = await manager.find(DepartamentoCaja, {
          where: { activo: true },
          order: { nombreUnidad: 'ASC', id: 'ASC' },
        });
        const fondos = await manager.find(FondoCaja, {
          where: { periodo: { id: periodo.id } },
          relations: { departamento: true },
        });
        const presentes = new Set(
          fondos.map((fondo) => fondo.departamento.id),
        );
        const faltantes = departamentos.filter(
          (departamento) => !presentes.has(departamento.id),
        );
        if (faltantes.length === 0) return;

        await manager.save(
          FondoCaja,
          faltantes.map((departamento) =>
            manager.create(FondoCaja, {
              periodo,
              departamento,
              montoSolicitado: null,
              estado: EstadoFondo.PENDIENTE,
              solicitadoEn: null,
              solicitadoPor: null,
              pieInforme: null,
            }),
          ),
        );
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
      ) {
        return;
      }
      throw error;
    }
  }

  /**
   * Abre un periodo y registra el fondo de cada departamento activo,
   * incluso cuando el monto es ₡0,00.
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
          `Ya hay un periodo abierto ("${abierto.nombre}"). Ciérrelo antes de abrir otro.`,
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

      const montos = new Map(
        dto.fondos.map((fondo) => [fondo.departamentoId, fondo.monto]),
      );
      if (montos.size !== dto.fondos.length) {
        throw new BadRequestException(
          'Cada departamento debe aparecer una sola vez.',
        );
      }
      const faltaAlguno = departamentos.some(
        (departamento) => !montos.has(departamento.id),
      );
      if (faltaAlguno || montos.size !== departamentos.length) {
        throw new BadRequestException(
          'Debe indicar el fondo de cada departamento activo, incluyendo ₡0,00.',
        );
      }

      const ahora = new Date();
      const fondos = departamentos.map((departamento) =>
        manager.create(FondoCaja, {
          periodo: creado,
          departamento,
          montoSolicitado: montos.get(departamento.id) ?? 0,
          estado: EstadoFondo.SOLICITADO,
          solicitadoEn: ahora,
          solicitadoPor: actor.id,
          pieInforme: null,
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
      await this.asegurarAsientosDentroDelRango(
        manager,
        id,
        dto.fechaInicio,
        dto.fechaFin,
      );

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

  async guardarPieInforme(
    periodoId: number,
    fondoId: number,
    dto: GuardarPieInformeDto,
    actor: UsuarioAutenticado,
  ): Promise<FondoCajaRespuesta> {
    this.policy.exigirGuardarPie(actor);

    const fondosRepo = this.dataSource.getRepository(FondoCaja);
    const fondo = await fondosRepo.findOne({
      where: { id: fondoId },
      relations: { departamento: true, periodo: true },
    });
    if (!fondo || fondo.periodo.id !== periodoId) {
      throw new NotFoundException(
        'El fondo de caja no existe en este periodo.',
      );
    }

    fondo.pieInforme = {
      observaciones: [
        dto.observaciones[0] ?? '',
        dto.observaciones[1] ?? '',
        dto.observaciones[2] ?? '',
      ],
      director: dto.director,
      presidente: dto.presidente,
      tesorera: dto.tesorera,
      firmaDirector: dto.firmaDirector,
      firmaPresidente: dto.firmaPresidente,
      firmaTesorera: dto.firmaTesorera,
      coordinador: dto.coordinador,
    };
    const guardado = await fondosRepo.save(fondo);
    return mapearFondo(guardado);
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

  private async asegurarAsientosDentroDelRango(
    manager: import('typeorm').EntityManager,
    periodoId: number,
    fechaInicio: string,
    fechaFin: string,
  ): Promise<void> {
    const fuera = await manager
      .createQueryBuilder(AsientoCaja, 'asiento')
      .innerJoin('asiento.fondo', 'fondo')
      .where('fondo.periodo_id = :periodoId', { periodoId })
      .andWhere(
        '(asiento.fecha < :fechaInicio OR asiento.fecha > :fechaFin)',
        { fechaInicio, fechaFin },
      )
      .getCount();

    if (fuera > 0) {
      throw new BadRequestException(
        'No se puede cambiar el rango: hay asientos con fecha fuera de las nuevas fechas del periodo.',
      );
    }
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
}
