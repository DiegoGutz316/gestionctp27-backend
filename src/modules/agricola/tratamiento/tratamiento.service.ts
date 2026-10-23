import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { patronContiene } from '../../../common/consultas/patron-like';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { Siembra } from '../siembra/entities/siembra.entity';

import { ConsultarTratamientosDto } from './dto/consultar-tratamientos.dto';
import { RegistrarTratamientoDto } from './dto/registrar-tratamiento.dto';
import { usaProducto } from './enums/actividad-agricola.enum';
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
      where: { id: dto.siembraId },
      relations: { cama: true },
    });

    if (!siembra) {
      throw new NotFoundException('La siembra seleccionada no existe.');
    }

    if (siembra.finalizadaEn) {
      throw new ConflictException(
        'No se puede registrar un cuidado en una siembra ya finalizada.',
      );
    }

    // El DTO solo descarta fechas futuras, asi que sin esto se podria registrar
    // un tratamiento anterior a la siembra. Ambas columnas son `date` y llegan
    // como texto AAAA-MM-DD, formato en el que el orden alfabetico coincide con
    // el cronologico.
    if (dto.fecha < siembra.fechaSiembra) {
      throw new BadRequestException(
        'La fecha del cuidado no puede ser anterior a la fecha de siembra.',
      );
    }

    // Un riego o una limpieza no llevan producto. El DTO ya rechaza que
    // vengan datos de producto en esas actividades; aqui se normalizan a null
    // para que la columna no guarde un indefinido.
    const conProducto = usaProducto(dto.actividad);

    const tratamiento = this.tratamientosRepo.create({
      siembra,
      actividad: dto.actividad,
      tipo: conProducto ? (dto.tipo ?? null) : null,
      producto: conProducto ? (dto.producto ?? null) : null,
      fecha: dto.fecha,
      cantidad: conProducto ? (dto.cantidad ?? null) : null,
      unidad: conProducto ? (dto.unidad ?? null) : null,
      observaciones: dto.observaciones ?? null,
      creadoPor: actor.id,
    });

    const guardado = await this.tratamientosRepo.save(tratamiento);

    guardado.siembra = siembra;

    return mapearTratamiento(guardado);
  }

  /**
   * Solo siembras activas. La cama, la ubicación y el cultivo salen de esa
   * relación; ubicación, cama, tipo y cultivo acotan la lista.
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
      consulta.andWhere('lower(siembra.tipoCultivo) LIKE lower(:cultivo)', {
        cultivo: patronContiene(filtros.cultivo),
      });
    }

    if (filtros.ubicacion) {
      consulta.andWhere('lower(cama.ubicacion) = lower(:ubicacion)', {
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
