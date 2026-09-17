import { Injectable, NotFoundException } from '@nestjs/common';
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
    });

    if (!siembra) {
      throw new NotFoundException('La siembra seleccionada no existe.');
    }

    const tratamiento = this.tratamientosRepo.create({
      siembra,
      producto: dto.producto,
      fecha: dto.fecha,
      cantidad: dto.cantidad,
      observaciones: dto.observaciones ?? null,
      creadoPor: actor.id,
    });

    const guardado = await this.tratamientosRepo.save(tratamiento);

    guardado.siembra = siembra;

    return mapearTratamiento(guardado);
  }

  async consultarPorCultivo(
    filtros: ConsultarTratamientosDto,
  ): Promise<TratamientoRespuesta[]> {
    const tratamientos = await this.tratamientosRepo
      .createQueryBuilder('tratamiento')
      .innerJoinAndSelect('tratamiento.siembra', 'siembra')
      .where('LOWER(siembra.tipoCultivo) = LOWER(:cultivo)', {
        cultivo: filtros.cultivo,
      })
      .orderBy('tratamiento.fecha', 'DESC')
      .addOrderBy('tratamiento.id', 'DESC')
      .getMany();

    return tratamientos.map(mapearTratamiento);
  }
}
