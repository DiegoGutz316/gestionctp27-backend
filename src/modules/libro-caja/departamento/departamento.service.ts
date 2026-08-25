import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import {
  crearResultadoPaginado,
  paginarQueryBuilder,
} from '../../../common/paginacion/helpers/paginar.helper';
import type { ResultadoPaginado } from '../../../common/paginacion/tipos/resultado-paginado';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { LibroCajaPolicy } from '../libro-caja.policy';
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

    const departamento = this.departamentosRepo.create({
      nombreUnidad: dto.nombreUnidad,
      tipoActividad: dto.tipoActividad,
      activo: true,
      creadoPor: actor.id,
      actualizadoPor: null,
    });

    try {
      return mapearDepartamento(
        await this.departamentosRepo.save(departamento),
      );
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
    departamento.activo = false;
    departamento.actualizadoPor = actor.id;
    return mapearDepartamento(await this.departamentosRepo.save(departamento));
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
