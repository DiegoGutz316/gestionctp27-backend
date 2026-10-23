import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, QueryFailedError, Repository } from 'typeorm';

import { patronContiene } from '../../../common/consultas/patron-like';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { Siembra } from '../siembra/entities/siembra.entity';
import { CrearCamaCultivoDto } from './dto/crear-cama-cultivo.dto';
import { EditarCamaCultivoDto } from './dto/editar-cama-cultivo.dto';
import { FiltrarCamasCultivoDto } from './dto/filtrar-camas-cultivo.dto';
import { CamaCultivo } from './entities/cama-cultivo.entity';
import { EstadoCamaCultivo } from './enums/estado-cama-cultivo.enum';

export type CamaCultivoConCultivo = CamaCultivo & {
  cultivoActual: string | null;
};

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

@Injectable()
export class CamaCultivoService {
  constructor(
    @InjectRepository(CamaCultivo)
    private readonly camasRepo: Repository<CamaCultivo>,
    @InjectRepository(Siembra)
    private readonly siembrasRepo: Repository<Siembra>,
  ) {}

  async crear(
    dto: CrearCamaCultivoDto,
    actor: UsuarioAutenticado,
  ): Promise<CamaCultivoConCultivo> {
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
      estado: EstadoCamaCultivo.DISPONIBLE,
      observaciones: dto.observaciones ?? null,
      creadoPor: actor.id,
    });

    try {
      const guardada = await this.camasRepo.save(cama);

      // Una cama recien creada no tiene siembra, asi que no tiene cultivo.
      return Object.assign(guardada, { cultivoActual: null });
    } catch (error) {
      this.relanzarSiCodigoDuplicado(error, dto.codigo);

      throw error;
    }
  }

  /**
   * Consulta las camas registradas. `q` busca en una sola pasada contra
   * código o estado. `ubicacion` y `camaId` acotan el listado que pide la
   * pantalla de camas.
   */
  async listar(
    filtros: FiltrarCamasCultivoDto,
  ): Promise<CamaCultivoConCultivo[]> {
    const consulta = this.camasRepo.createQueryBuilder('cama');

    if (filtros.q) {
      consulta.andWhere(
        `(lower(cama.codigo) LIKE lower(:q)
          OR lower(cama.estado) LIKE lower(:q))`,
        { q: patronContiene(filtros.q) },
      );
    }

    if (filtros.ubicacion) {
      consulta.andWhere('lower(cama.ubicacion) = lower(:ubicacion)', {
        ubicacion: filtros.ubicacion,
      });
    }

    if (filtros.camaId) {
      consulta.andWhere('cama.id = :camaId', { camaId: filtros.camaId });
    }

    consulta.orderBy('cama.codigo', 'ASC');
    consulta.addOrderBy('cama.id', 'ASC');

    return await this.conCultivoActual(await consulta.getMany());
  }

  async obtener(id: number): Promise<CamaCultivoConCultivo> {
    const [cama] = await this.conCultivoActual([await this.buscarPorId(id)]);

    return cama;
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
  ): Promise<CamaCultivoConCultivo> {
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
      ...(dto.estado !== undefined ? { estado: dto.estado } : {}),
      observaciones: dto.observaciones ?? null,

      // Usuario autenticado que realizó la modificación.
      actualizadoPor: actor.id,
    });

    try {
      const guardada = await this.camasRepo.save(cama);
      const [conCultivo] = await this.conCultivoActual([guardada]);

      return conCultivo;
    } catch (error) {
      this.relanzarSiCodigoDuplicado(error, dto.codigo);

      throw error;
    }
  }

  /**
   * El cultivo no se guarda en la cama: es el de la siembra que aún no
   * finaliza. Si hay varias abiertas, gana la más reciente.
   */
  private async conCultivoActual(
    camas: CamaCultivo[],
  ): Promise<CamaCultivoConCultivo[]> {
    if (camas.length === 0) return [];

    const abiertas = await this.siembrasRepo.find({
      where: {
        cama: { id: In(camas.map((cama) => cama.id)) },
        finalizadaEn: IsNull(),
      },
      relations: { cama: true },
      order: { fechaSiembra: 'DESC', id: 'DESC' },
    });

    const porCama = new Map<number, string>();

    for (const siembra of abiertas) {
      if (!porCama.has(siembra.cama.id)) {
        porCama.set(siembra.cama.id, siembra.tipoCultivo);
      }
    }

    return camas.map((cama) =>
      Object.assign(cama, { cultivoActual: porCama.get(cama.id) ?? null }),
    );
  }

  /**
   * Eliminar una cama solo tiene sentido cuando nunca se uso: si tiene
   * siembras, borrarla se llevaria por delante el historial de produccion
   * que cuelga de ellas. La clave foranea es RESTRICT y la base lo impediria
   * igual, pero devolveria un 500; aqui se explica el motivo con un 409.
   */
  async eliminar(id: number): Promise<void> {
    const cama = await this.buscarPorId(id);

    const siembras = await this.siembrasRepo.count({
      where: { cama: { id: cama.id } },
    });

    if (siembras > 0) {
      throw new ConflictException(
        `No se puede eliminar la cama "${cama.codigo}": tiene ${siembras} ` +
          `${siembras === 1 ? 'siembra registrada' : 'siembras registradas'}.`,
      );
    }

    try {
      await this.camasRepo.remove(cama);
    } catch (error) {
      // Red de seguridad: entre la comprobacion y el borrado alguien pudo
      // registrar una siembra en esta cama.
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code ===
          PG_FOREIGN_KEY_VIOLATION
      ) {
        throw new ConflictException(
          `No se puede eliminar la cama "${cama.codigo}": está en uso.`,
        );
      }

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
