import {
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
import { LibroCajaPolicy } from '../libro-caja.policy';
import { AsientoCaja } from '../periodo/entities/asiento-caja.entity';
import { FondoCaja } from '../periodo/entities/fondo-caja.entity';
import { PeriodoCaja } from '../periodo/entities/periodo-caja.entity';
import { EstadoFondo } from '../periodo/enums/estado-fondo.enum';
import { EstadoPeriodo } from '../periodo/enums/estado-periodo.enum';
import { CrearDepartamentoDto } from './dto/crear-departamento.dto';
import { EditarDepartamentoDto } from './dto/editar-departamento.dto';
import { FiltrarDepartamentosDto } from './dto/filtrar-departamentos.dto';
import { DepartamentoCaja } from './entities/departamento-caja.entity';
import {
  mapearDepartamento,
  type DepartamentoCajaRespuesta,
} from './respuestas/departamento.mapper';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class DepartamentoService {
  constructor(
    @InjectRepository(DepartamentoCaja)
    private readonly departamentosRepo: Repository<DepartamentoCaja>,
    private readonly dataSource: DataSource,
    private readonly policy: LibroCajaPolicy,
  ) {}

  async listar(
    filtros: FiltrarDepartamentosDto,
  ): Promise<ResultadoPaginado<DepartamentoCajaRespuesta>> {
    const consulta = this.departamentosRepo
      .createQueryBuilder('departamento')
      .orderBy('departamento.nombreUnidad', 'ASC')
      .addOrderBy('departamento.id', 'ASC');

    if (typeof filtros.activo === 'boolean') {
      consulta.andWhere('departamento.activo = :activo', {
        activo: filtros.activo,
      });
    } else {
      consulta.andWhere('departamento.activo = true');
    }

    if (filtros.tipoActividad) {
      consulta.andWhere(
        'lower(departamento.tipoActividad) LIKE lower(:tipoActividad)',
        { tipoActividad: `%${filtros.tipoActividad}%` },
      );
    }

    if (filtros.q) {
      consulta.andWhere(
        '(lower(departamento.nombreUnidad) LIKE lower(:q) OR lower(departamento.tipoActividad) LIKE lower(:q))',
        { q: `%${filtros.q}%` },
      );
    }

    const { entidades, total } = await paginarQueryBuilder(consulta, filtros);
    return crearResultadoPaginado(
      entidades.map(mapearDepartamento),
      filtros,
      total,
    );
  }

  async obtener(id: number): Promise<DepartamentoCajaRespuesta> {
    return mapearDepartamento(await this.buscar(id));
  }

  async crear(
    dto: CrearDepartamentoDto,
    actor: UsuarioAutenticado,
  ): Promise<DepartamentoCajaRespuesta> {
    this.policy.exigirAdministrador(actor);
    await this.asegurarNombreLibre(dto.nombreUnidad);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const departamento = await manager.save(
          DepartamentoCaja,
          manager.create(DepartamentoCaja, {
            nombreUnidad: dto.nombreUnidad,
            tipoActividad: dto.tipoActividad,
            activo: true,
            creadoPor: actor.id,
            actualizadoPor: null,
          }),
        );

        const abierto = await manager.findOne(PeriodoCaja, {
          where: { estado: EstadoPeriodo.ABIERTO },
        });
        if (abierto) {
          await manager.save(
            FondoCaja,
            manager.create(FondoCaja, {
              periodo: abierto,
              departamento,
              montoSolicitado: null,
              estado: EstadoFondo.PENDIENTE,
              solicitadoEn: null,
              solicitadoPor: null,
              pieInforme: null,
            }),
          );
        }

        return mapearDepartamento(departamento);
      });
    } catch (error) {
      this.relanzarSiEsDuplicado(error, dto.nombreUnidad);
      throw error;
    }
  }

  async actualizar(
    id: number,
    dto: EditarDepartamentoDto,
    actor: UsuarioAutenticado,
  ): Promise<DepartamentoCajaRespuesta> {
    this.policy.exigirAdministrador(actor);
    const departamento = await this.buscar(id, true);
    await this.asegurarNombreLibre(dto.nombreUnidad, id);

    departamento.nombreUnidad = dto.nombreUnidad;
    departamento.tipoActividad = dto.tipoActividad;
    departamento.actualizadoPor = actor.id;

    try {
      return mapearDepartamento(
        await this.departamentosRepo.save(departamento),
      );
    } catch (error) {
      this.relanzarSiEsDuplicado(error, dto.nombreUnidad);
      throw error;
    }
  }

  async desactivar(
    id: number,
    actor: UsuarioAutenticado,
  ): Promise<DepartamentoCajaRespuesta> {
    this.policy.exigirAdministrador(actor);
    const departamento = await this.buscar(id, true);

    return this.dataSource.transaction(async (manager) => {
      departamento.activo = false;
      departamento.actualizadoPor = actor.id;
      const guardado = await manager.save(DepartamentoCaja, departamento);

      const abierto = await manager.findOne(PeriodoCaja, {
        where: { estado: EstadoPeriodo.ABIERTO },
      });
      if (abierto) {
        const fondo = await manager.findOne(FondoCaja, {
          where: {
            periodo: { id: abierto.id },
            departamento: { id: departamento.id },
          },
        });
        if (fondo) {
          const asientos = await manager.count(AsientoCaja, {
            where: { fondo: { id: fondo.id } },
          });
          if (asientos === 0) {
            await manager.delete(FondoCaja, fondo.id);
          }
        }
      }

      return mapearDepartamento(guardado);
    });
  }

  private async buscar(
    id: number,
    exigirActivo = false,
  ): Promise<DepartamentoCaja> {
    const departamento = await this.departamentosRepo.findOne({
      where: { id },
    });
    if (!departamento || (exigirActivo && !departamento.activo)) {
      throw new NotFoundException('El departamento no existe.');
    }
    return departamento;
  }

  private async asegurarNombreLibre(
    nombreUnidad: string,
    idExcluido?: number,
  ): Promise<void> {
    const consulta = this.departamentosRepo
      .createQueryBuilder('departamento')
      .where('lower(departamento.nombreUnidad) = lower(:nombre)', {
        nombre: nombreUnidad,
      })
      .andWhere('departamento.activo = true');

    if (idExcluido !== undefined) {
      consulta.andWhere('departamento.id != :idExcluido', { idExcluido });
    }

    const duplicado = await consulta.getOne();
    if (duplicado) {
      this.lanzarDuplicado(nombreUnidad);
    }
  }

  private lanzarDuplicado(nombreUnidad: string): never {
    throw new ConflictException(
      `Ya existe un departamento activo llamado "${nombreUnidad}".`,
    );
  }

  private relanzarSiEsDuplicado(error: unknown, nombreUnidad: string): void {
    if (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
    ) {
      this.lanzarDuplicado(nombreUnidad);
    }
  }
}
