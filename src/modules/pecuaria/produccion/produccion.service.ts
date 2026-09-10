import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { Animal } from '../animal/entities/animal.entity';
import { esAnimalActivo } from '../animal/enums/estado-animal.enum';
import { ConsultarProduccionDto } from './dto/consultar-produccion.dto';
import { RegistrarProduccionDto } from './dto/registrar-produccion.dto';
import { ProduccionPecuaria } from './entities/produccion-pecuaria.entity';
import {
  mapearConsultaProduccion,
  mapearProduccion,
  type ConsultaProduccionRespuesta,
  type ProduccionRespuesta,
} from './respuestas/produccion.mapper';

@Injectable()
export class ProduccionService {
  constructor(
    @InjectRepository(Animal)
    private readonly animalesRepo: Repository<Animal>,
    @InjectRepository(ProduccionPecuaria)
    private readonly produccionRepo: Repository<ProduccionPecuaria>,
  ) {}

  async registrar(
    dto: RegistrarProduccionDto,
    actor: UsuarioAutenticado,
  ): Promise<ProduccionRespuesta> {
    const animal = await this.buscarAnimal(dto.animalId);

    if (!esAnimalActivo(animal.estado)) {
      throw new BadRequestException(
        'Solo se puede registrar producción de un animal activo.',
      );
    }

    const registro = this.produccionRepo.create({
      animal,
      tipoProduccion: dto.tipoProduccion,
      cantidad: dto.cantidad,
      fecha: dto.fecha,
      creadoPor: actor.id,
    });

    const guardado = await this.produccionRepo.save(registro);
    guardado.animal = animal;

    return mapearProduccion(guardado);
  }

  async consultar(
    dto: ConsultarProduccionDto,
  ): Promise<ConsultaProduccionRespuesta> {
    const animal = await this.buscarAnimal(dto.animalId);
    const consulta = this.produccionRepo
      .createQueryBuilder('produccion')
      .innerJoinAndSelect('produccion.animal', 'animal')
      .where('animal.id = :animalId', { animalId: animal.id });

    if (dto.desde) {
      consulta.andWhere('produccion.fecha >= :desde', { desde: dto.desde });
    }

    if (dto.tipoProduccion) {
      consulta.andWhere('produccion.tipoProduccion = :tipo', {
        tipo: dto.tipoProduccion,
      });
    }

    const registros = await consulta
      .orderBy('produccion.fecha', 'DESC')
      .addOrderBy('produccion.id', 'DESC')
      .getMany();

    return mapearConsultaProduccion(animal, dto, registros);
  }

  private async buscarAnimal(id: number): Promise<Animal> {
    const animal = await this.animalesRepo.findOne({
      where: { id },
    });

    if (!animal) {
      throw new NotFoundException('El animal no existe.');
    }

    return animal;
  }
}
