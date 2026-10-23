import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import { Animal } from '../../pecuaria/animal/entities/animal.entity';
import { ProduccionPecuaria } from '../../pecuaria/produccion/entities/produccion-pecuaria.entity';
import { TipoProduccion } from '../../pecuaria/produccion/enums/tipo-produccion.enum';

import { ConsultarReporteProduccionPecuariaDto } from './dto/consultar-reporte-produccion-pecuaria.dto';
import { ReporteProduccionPecuariaService } from './reporte-produccion-pecuaria.service';

describe('ReporteProduccionPecuariaService', () => {
  const animal = {
    id: 1,
    codigo: 'VAC-001',
    nombre: 'Luna',
    especie: 'VACA',
    estado: 'ACTIVO',
  } as Animal;

  const dto: ConsultarReporteProduccionPecuariaDto = {
    animalId: 1,
    fechaInicio: '2026-09-01',
    fechaFin: '2026-09-30',
  };

  it('genera el reporte con los registros del período filtrado por animal', async () => {
    const registros = [
      {
        id: 1,
        animal,
        tipoProduccion: TipoProduccion.LECHE,
        cantidad: 10,
        fecha: '2026-09-10',
      },
    ] as ProduccionPecuaria[];
    const { service, consulta } = crearServicio({ animal, registros });

    const resultado = await service.generar(dto);

    expect(consulta.where).toHaveBeenCalledWith('animal.id = :animalId', {
      animalId: 1,
    });
    expect(resultado.animal.id).toBe(1);
    expect(resultado.registros).toHaveLength(1);
  });

  it('filtra por rango de fechas cerrado', async () => {
    const { service, consulta } = crearServicio({ animal, registros: [] });

    await service.generar(dto);

    expect(consulta.andWhere).toHaveBeenCalledWith(
      'produccion.fecha >= :fechaInicio',
      { fechaInicio: '2026-09-01' },
    );
    expect(consulta.andWhere).toHaveBeenCalledWith(
      'produccion.fecha <= :fechaFin',
      { fechaFin: '2026-09-30' },
    );
  });

  it('rechaza el reporte si el animal no existe', async () => {
    const { service } = crearServicio({ animal: null, registros: [] });

    await expect(service.generar(dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('devuelve registros y totales vacíos cuando no hay producción en el período', async () => {
    const { service } = crearServicio({ animal, registros: [] });

    const resultado = await service.generar(dto);

    expect(resultado.registros).toEqual([]);
    expect(resultado.totales).toEqual([]);
  });

  it('calcula el total sumando varios registros del mismo tipo de producción', async () => {
    const registros = [
      {
        id: 1,
        animal,
        tipoProduccion: TipoProduccion.LECHE,
        cantidad: 10,
        fecha: '2026-09-05',
      },
      {
        id: 2,
        animal,
        tipoProduccion: TipoProduccion.LECHE,
        cantidad: 15.5,
        fecha: '2026-09-10',
      },
    ] as ProduccionPecuaria[];
    const { service } = crearServicio({ animal, registros });

    const resultado = await service.generar(dto);

    expect(resultado.totales).toEqual([
      { tipoProduccion: TipoProduccion.LECHE, cantidad: 25.5 },
    ]);
  });

  it('mantiene los totales separados por tipo de producción', async () => {
    const registros = [
      {
        id: 1,
        animal,
        tipoProduccion: TipoProduccion.LECHE,
        cantidad: 25.5,
        fecha: '2026-09-05',
      },
      {
        id: 2,
        animal,
        tipoProduccion: TipoProduccion.HUEVOS,
        cantidad: 20,
        fecha: '2026-09-06',
      },
    ] as ProduccionPecuaria[];
    const { service } = crearServicio({ animal, registros });

    const resultado = await service.generar(dto);

    expect(resultado.totales).toEqual(
      expect.arrayContaining([
        { tipoProduccion: TipoProduccion.LECHE, cantidad: 25.5 },
        { tipoProduccion: TipoProduccion.HUEVOS, cantidad: 20 },
      ]),
    );
    expect(resultado.totales).toHaveLength(2);
  });
});

function crearServicio(opciones: {
  animal: Animal | null;
  registros: ProduccionPecuaria[];
}) {
  const animalesRepo = {
    findOne: jest.fn().mockResolvedValue(opciones.animal),
  };
  const consulta = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(opciones.registros),
  };
  const produccionRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(consulta),
  };
  const service = new ReporteProduccionPecuariaService(
    animalesRepo as unknown as Repository<Animal>,
    produccionRepo as unknown as Repository<ProduccionPecuaria>,
  );

  return { service, consulta };
}
