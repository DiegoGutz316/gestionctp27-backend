import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { fechaDeHoy } from '../../../common/validacion/fecha-no-futura.validator';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { CamaCultivo } from '../cama/entities/cama-cultivo.entity';
import { EstadoCamaCultivo } from '../cama/enums/estado-cama-cultivo.enum';
import { ConsultarSiembrasDto } from './dto/consultar-siembras.dto';
import { FinalizarSiembraDto } from './dto/finalizar-siembra.dto';
import { RegistrarSiembraDto } from './dto/registrar-siembra.dto';
import { MotivoFinalizacionSiembra } from './enums/motivo-finalizacion.enum';
import { Siembra } from './entities/siembra.entity';
import {
  mapearSiembra,
  type SiembraRespuesta,
} from './respuestas/siembra.mapper';

@Injectable()
export class SiembraService {
  constructor(
    @InjectRepository(CamaCultivo)
    private readonly camasRepo: Repository<CamaCultivo>,
    @InjectRepository(Siembra)
    private readonly siembrasRepo: Repository<Siembra>,
  ) {}

  async registrar(
    dto: RegistrarSiembraDto,
    actor: UsuarioAutenticado,
  ): Promise<SiembraRespuesta> {
    const cama = await this.camasRepo.findOne({ where: { id: dto.camaId } });

    if (!cama) {
      throw new NotFoundException('La cama de cultivo seleccionada no existe.');
    }

    if (cama.estado !== EstadoCamaCultivo.DISPONIBLE) {
      throw new ConflictException(
        'La cama seleccionada ya tiene una siembra activa.',
      );
    }

    const activa = await this.siembrasRepo.findOne({
      where: { cama: { id: cama.id }, finalizadaEn: IsNull() },
    });

    if (activa) {
      throw new ConflictException(
        'La cama seleccionada ya tiene una siembra activa.',
      );
    }

    const siembra = this.siembrasRepo.create({
      cama,
      tipoCultivo: dto.tipoCultivo,
      fechaSiembra: dto.fechaSiembra,
      cantidadSembrada: dto.cantidadSembrada,
      creadoPor: actor.id,
      finalizadaEn: null,
    });
    const guardada = await this.siembrasRepo.save(siembra);
    guardada.cama = cama;

    cama.estado = EstadoCamaCultivo.SEMBRADA;
    cama.actualizadoPor = actor.id;
    await this.camasRepo.save(cama);

    return mapearSiembra(guardada);
  }

  /**
   * Cierra el ciclo sin borrar la siembra. La cama vuelve a estar disponible
   * y deja de mostrar ese cultivo como actual.
   */
  async finalizar(
    id: number,
    dto: FinalizarSiembraDto,
    actor: UsuarioAutenticado,
  ): Promise<SiembraRespuesta> {
    if (dto.motivo === MotivoFinalizacionSiembra.OTRO && !dto.detalle) {
      throw new BadRequestException('Describa el motivo de finalización.');
    }

    const siembra = await this.siembrasRepo.findOne({
      where: { id },
      relations: { cama: true },
    });

    if (!siembra) {
      throw new NotFoundException('La siembra seleccionada no existe.');
    }

    this.cerrarCiclo(siembra, actor.id, dto.motivo, dto.detalle ?? null);

    await this.camasRepo.save(siembra.cama);
    const guardada = await this.siembrasRepo.save(siembra);

    return mapearSiembra(guardada);
  }

  /**
   * Libera la cama. No borra la siembra ni sus cosechas. Lo usa el cierre
   * sin cosecha y también la cosecha que cierra el ciclo.
   */
  cerrarCiclo(
    siembra: Siembra,
    actorId: string,
    motivo: string | null = null,
    detalle: string | null = null,
  ): void {
    if (siembra.finalizadaEn) {
      throw new ConflictException('Esta siembra ya fue finalizada.');
    }

    siembra.finalizadaEn = fechaDeHoy();
    siembra.motivoFinalizacion = motivo;
    siembra.motivoDetalle = detalle;
    siembra.cama.estado = EstadoCamaCultivo.DISPONIBLE;
    siembra.cama.actualizadoPor = actorId;
  }

  async consultar(filtros: ConsultarSiembrasDto): Promise<SiembraRespuesta[]> {
    const consulta = this.siembrasRepo
      .createQueryBuilder('siembra')
      .innerJoinAndSelect('siembra.cama', 'cama');

    if (filtros.cultivo) {
      consulta.andWhere('lower(siembra.tipoCultivo) LIKE lower(:cultivo)', {
        cultivo: `%${filtros.cultivo}%`,
      });
    }

    if (filtros.fecha) {
      consulta.andWhere('siembra.fechaSiembra = :fecha', {
        fecha: filtros.fecha,
      });
    }

    const siembras = await consulta
      .orderBy('siembra.fechaSiembra', 'DESC')
      .addOrderBy('siembra.id', 'DESC')
      .getMany();

    return siembras.map(mapearSiembra);
  }
}
