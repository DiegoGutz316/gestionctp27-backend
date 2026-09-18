import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { Siembra } from '../siembra/entities/siembra.entity';

import { RegistrarCosechaDto } from './dto/registrar-cosecha.dto';
import { Cosecha } from './entities/cosecha.entity';
import {
  mapearCosecha,
  type CosechaRespuesta,
} from './respuestas/cosecha.mapper';

@Injectable()
export class CosechaService {
  constructor(
    @InjectRepository(Siembra)
    private readonly siembrasRepo: Repository<Siembra>,

    @InjectRepository(Cosecha)
    private readonly cosechasRepo: Repository<Cosecha>,
  ) {}

  /**
   * Backlog 3.6: "El sistema permite seleccionar una siembra existente" y
   * "La fecha de cosecha no puede ser anterior a la fecha de siembra".
   *
   * Son dos situaciones distintas: una siembra que no existe es un 404, y una
   * fecha imposible es una peticion valida con datos incoherentes.
   */
  async registrar(
    dto: RegistrarCosechaDto,
    actor: UsuarioAutenticado,
  ): Promise<CosechaRespuesta> {
    const siembra = await this.siembrasRepo.findOne({
      where: { id: dto.siembraId },
    });

    if (!siembra) {
      throw new NotFoundException('La siembra seleccionada no existe.');
    }

    // Ambas columnas son `date` y llegan como texto AAAA-MM-DD, formato en el
    // que el orden alfabetico coincide con el cronologico.
    if (dto.fecha < siembra.fechaSiembra) {
      throw new BadRequestException(
        'La fecha de cosecha no puede ser anterior a la fecha de siembra.',
      );
    }

    const cosecha = this.cosechasRepo.create({
      siembra,
      fecha: dto.fecha,
      cantidadObtenida: dto.cantidadObtenida,
      observaciones: dto.observaciones ?? null,

      // El responsable sale de la sesion, nunca del cuerpo de la peticion.
      creadoPor: actor.id,
    });

    const guardada = await this.cosechasRepo.save(cosecha);

    guardada.siembra = siembra;

    return mapearCosecha(guardada);
  }
}
