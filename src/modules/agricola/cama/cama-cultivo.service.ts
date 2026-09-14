import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { CrearCamaCultivoDto } from './dto/crear-cama-cultivo.dto';
import { EditarCamaCultivoDto } from './dto/editar-cama-cultivo.dto';
import { FiltrarCamasCultivoDto } from './dto/filtrar-camas-cultivo.dto';
import { CamaCultivo } from './entities/cama-cultivo.entity';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class CamaCultivoService {
  constructor(
    @InjectRepository(CamaCultivo)
    private readonly camasRepo: Repository<CamaCultivo>,
  ) {}

  async crear(
    dto: CrearCamaCultivoDto,
    actor: UsuarioAutenticado,
  ): Promise<CamaCultivo> {
    const duplicada = await this.camasRepo.findOne({
      where: {
        codigo: dto.codigo,
      },
    });

    if (duplicada) {
      this.lanzarCodigoDuplicado(dto.codigo);
    }

    const cama = this.camasRepo.create({
      codigo: dto.codigo,
      ubicacion: dto.ubicacion,
      estado: dto.estado,
      observaciones: dto.observaciones ?? null,
      creadoPor: actor.id,
    });

    try {
      return await this.camasRepo.save(cama);
    } catch (error) {
      this.relanzarSiCodigoDuplicado(error, dto.codigo);

      throw error;
    }
  }

  /**
   * Consulta las camas registradas. `q` busca en una sola pasada contra
   * código o estado, igual que AnimalService.listar busca en código, nombre
   * o estado.
   */
  async listar(filtros: FiltrarCamasCultivoDto): Promise<CamaCultivo[]> {
    const consulta = this.camasRepo.createQueryBuilder('cama');

    if (filtros.q) {
      consulta.andWhere(
        `(lower(cama.codigo) LIKE lower(:q)
          OR lower(cama.estado) LIKE lower(:q))`,
        { q: `%${filtros.q}%` },
      );
    }

    consulta.orderBy('cama.codigo', 'ASC');
    consulta.addOrderBy('cama.id', 'ASC');

    return await consulta.getMany();
  }

  async obtener(id: number): Promise<CamaCultivo> {
    return await this.buscarPorId(id);
  }

  /**
   * A diferencia de la implementación anterior, el código ahora sí es
   * editable (mismo criterio que Animal.codigo): se valida que ningún OTRO
   * registro tenga ya ese código antes de guardar, excluyendo la propia cama
   * de la comprobación, igual que AnimalService.actualizar.
   */
  async actualizar(
    id: number,
    dto: EditarCamaCultivoDto,
    actor: UsuarioAutenticado,
  ): Promise<CamaCultivo> {
    const cama = await this.buscarPorId(id);

    const duplicada = await this.camasRepo
      .createQueryBuilder('cama')
      .where('cama.codigo = :codigo', {
        codigo: dto.codigo,
      })
      .andWhere('cama.id != :id', {
        id,
      })
      .getOne();

    if (duplicada) {
      this.lanzarCodigoDuplicado(dto.codigo);
    }

    Object.assign(cama, {
      codigo: dto.codigo,
      ubicacion: dto.ubicacion,
      estado: dto.estado,
      observaciones: dto.observaciones ?? null,

      // Usuario autenticado que realizó la modificación.
      actualizadoPor: actor.id,
    });

    try {
      return await this.camasRepo.save(cama);
    } catch (error) {
      this.relanzarSiCodigoDuplicado(error, dto.codigo);

      throw error;
    }
  }

  private async buscarPorId(id: number): Promise<CamaCultivo> {
    const cama = await this.camasRepo.findOne({
      where: {
        id,
      },
    });

    if (!cama) {
      throw new NotFoundException('La cama de cultivo no existe.');
    }

    return cama;
  }

  private lanzarCodigoDuplicado(codigo: string): never {
    throw new ConflictException(
      `Ya existe una cama de cultivo registrada con el código "${codigo}".`,
    );
  }

  private relanzarSiCodigoDuplicado(error: unknown, codigo: string): void {
    if (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
    ) {
      this.lanzarCodigoDuplicado(codigo);
    }
  }
}
