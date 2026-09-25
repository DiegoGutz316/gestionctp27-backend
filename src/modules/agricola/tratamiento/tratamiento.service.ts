import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { Siembra } from '../siembra/entities/siembra.entity';

import { ConsultarTratamientosDto } from './dto/consultar-tratamientos.dto';
import { RegistrarTratamientoDto } from './dto/registrar-tratamiento.dto';
import { TratamientoAgricola } from './entities/tratamiento-agricola.entity';
import {
  mapearTratamiento,
  type TratamientoRespuesta,
} from './respuestas/tratamiento.mapper';

@Injectable()
export class TratamientoService {
  constructor(
    @InjectRepository(Siembra)
    private readonly siembrasRepo: Repository<Siembra>,

    @InjectRepository(TratamientoAgricola)
    private readonly tratamientosRepo: Repository<TratamientoAgricola>,
  ) {}

  async registrar(
    dto: RegistrarTratamientoDto,
    actor: UsuarioAutenticado,
  ): Promise<TratamientoRespuesta> {
    const siembra = await this.siembrasRepo.findOne({
      where: {
        id: dto.siembraId,
      },
      relations: { cama: true },
    });

    if (!siembra) {
      throw new NotFoundException('La siembra seleccionada no existe.');
    }

    // El DTO solo descarta fechas futuras, asi que sin esto se podria registrar
    // un tratamiento anterior a la siembra. Ambas columnas son `date` y llegan
    // como texto AAAA-MM-DD, formato en el que el orden alfabetico coincide con
    // el cronologico.
    if (dto.fecha < siembra.fechaSiembra) {
      throw new BadRequestException(
        'La fecha del tratamiento no puede ser anterior a la fecha de siembra.',
      );
    }

    const tratamiento = this.tratamientosRepo.create({
      siembra,
      tipo: dto.tipo,
      producto: dto.producto,
      fecha: dto.fecha,
      cantidad: dto.cantidad,
      unidad: dto.unidad,
      observaciones: dto.observaciones ?? null,
      creadoPor: actor.id,
    });

    const guardado = await this.tratamientosRepo.save(tratamiento);

    guardado.siembra = siembra;

    return mapearTratamiento(guardado);
  }

  /**
   * La pantalla abre el historial completo de las siembras que siguen
   * activas. Ubicación, cama, tipo y cultivo acotan esa lista.
   */
  async consultar(
    filtros: ConsultarTratamientosDto,
  ): Promise<TratamientoRespuesta[]> {
    const consulta = this.tratamientosRepo
      .createQueryBuilder('tratamiento')
      .innerJoinAndSelect('tratamiento.siembra', 'siembra')
      .innerJoinAndSelect('siembra.cama', 'cama')
      .where('siembra.finalizadaEn IS NULL');

    if (filtros.cultivo) {
      consulta.andWhere('LOWER(siembra.tipoCultivo) = LOWER(:cultivo)', {
        cultivo: filtros.cultivo,
      });
    }

    if (filtros.ubicacion) {
      consulta.andWhere('LOWER(cama.ubicacion) = LOWER(:ubicacion)', {
        ubicacion: filtros.ubicacion,
      });
    }

    if (filtros.camaId) {
      consulta.andWhere('cama.id = :camaId', { camaId: filtros.camaId });
    }

    if (filtros.tipo) {
      consulta.andWhere('tratamiento.tipo = :tipo', { tipo: filtros.tipo });
    }

    const tratamientos = await consulta
      .orderBy('tratamiento.fecha', 'DESC')
      .addOrderBy('tratamiento.id', 'DESC')
      .getMany();

    return tratamientos.map(mapearTratamiento);
  }
}
