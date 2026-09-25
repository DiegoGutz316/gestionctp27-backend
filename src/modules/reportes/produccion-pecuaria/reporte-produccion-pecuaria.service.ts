import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Animal } from '../../pecuaria/animal/entities/animal.entity';
import { ProduccionPecuaria } from '../../pecuaria/produccion/entities/produccion-pecuaria.entity';

import { ConsultarReporteProduccionPecuariaDto } from './dto/consultar-reporte-produccion-pecuaria.dto';
import {
  mapearReporteProduccionPecuaria,
  type ReporteProduccionPecuariaRespuesta,
} from './respuestas/reporte-produccion-pecuaria.mapper';

@Injectable()
export class ReporteProduccionPecuariaService {
  constructor(
    @InjectRepository(Animal)
    private readonly animalesRepo: Repository<Animal>,

    @InjectRepository(ProduccionPecuaria)
    private readonly produccionRepo: Repository<ProduccionPecuaria>,
  ) {}

  /**
   * Backlog 5.1: "filtrar por animal y rango de fechas" y "calcular
   * correctamente los totales de produccion del periodo seleccionado".
   *
   * Mismo patron de consulta que ProduccionService.consultar
   * (src/modules/pecuaria/produccion/produccion.service.ts): valida que el
   * animal exista antes de consultar (404 si no), y filtra por rango
   * cerrado de fecha en vez del `desde` abierto que usa el endpoint de
   * Pecuaria, porque aqui ambos extremos son obligatorios.
   *
   * Si el animal existe pero no tiene produccion en el rango, se devuelve
   * `registros: []` y `totales: []`: una consulta sin resultados es valida,
   * no un error.
   */
  async generar(
    dto: ConsultarReporteProduccionPecuariaDto,
  ): Promise<ReporteProduccionPecuariaRespuesta> {
    const animal = await this.buscarAnimal(dto.animalId);

    const registros = await this.produccionRepo
      .createQueryBuilder('produccion')
      .innerJoinAndSelect('produccion.animal', 'animal')
      .where('animal.id = :animalId', { animalId: animal.id })
      .andWhere('produccion.fecha >= :fechaInicio', {
        fechaInicio: dto.fechaInicio,
      })
      .andWhere('produccion.fecha <= :fechaFin', { fechaFin: dto.fechaFin })
      .orderBy('produccion.fecha', 'DESC')
      .addOrderBy('produccion.id', 'DESC')
      .getMany();

    return mapearReporteProduccionPecuaria(animal, dto, registros);
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
