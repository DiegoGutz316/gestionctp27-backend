import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { CamaCultivo } from '../cama/entities/cama-cultivo.entity';
import { ConsultarSiembrasDto } from './dto/consultar-siembras.dto';
import { RegistrarSiembraDto } from './dto/registrar-siembra.dto';
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

    const siembra = this.siembrasRepo.create({
      cama,
      tipoCultivo: dto.tipoCultivo,
      fechaSiembra: dto.fechaSiembra,
      cantidadSembrada: dto.cantidadSembrada,
      creadoPor: actor.id,
    });
    const guardada = await this.siembrasRepo.save(siembra);
    guardada.cama = cama;

    return mapearSiembra(guardada);
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
