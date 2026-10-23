import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { Animal } from '../animal/entities/animal.entity';
import type { ConsultarProduccionDto } from './dto/consultar-produccion.dto';
import type { RegistrarProduccionDto } from './dto/registrar-produccion.dto';
import { ProduccionPecuaria } from './entities/produccion-pecuaria.entity';
import { TipoProduccion } from './enums/tipo-produccion.enum';
import { ProduccionService } from './produccion.service';

describe('ProduccionService', () => {
  const actor: UsuarioAutenticado = {
    id: 'b62082bb-17b7-49c1-994b-538d77bc814a',
    correo: 'docente@ctp.test',
    nombre: 'Docente pecuario',
    rol: RolUsuario.DOCENTE_PECUARIO,
  };

  const animalActivo = {
    id: 1,
    codigo: 'BOV-001',
    nombre: 'Luna',
    especie: 'VACA',
    raza: 'Holstein',
    fechaNacimiento: '2024-03-15',
    estado: 'ACTIVO',
    observaciones: null,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    creadoPor: actor.id,
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoPor: null,
  } as Animal;

  const dto: RegistrarProduccionDto = {
    animalId: 1,
    tipoProduccion: TipoProduccion.LECHE,
    cantidad: 12.5,
    fecha: '2026-09-08',
  };

  it('registra producción de un animal activo y deja al usuario como responsable', async () => {
    const guardados: unknown[] = [];
    const { service, produccionRepo } = crearServicio({
      animal: animalActivo,
      save: (valor: unknown) => {
        guardados.push(valor);
        return Promise.resolve({
          id: 10,
          ...(valor as object),
          creadoEn: new Date('2026-09-08T18:00:00.000Z'),
        });
      },
    });

    const resultado = await service.registrar(dto, actor);

    expect(produccionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        animal: animalActivo,
        tipoProduccion: TipoProduccion.LECHE,
        cantidad: 12.5,
        fecha: '2026-09-08',
        creadoPor: actor.id,
      }),
    );
    expect(guardados).toHaveLength(1);
    expect(resultado).toEqual(
      expect.objectContaining({
        id: 10,
        animalId: 1,
        tipoProduccion: TipoProduccion.LECHE,
        cantidad: 12.5,
        fecha: '2026-09-08',
        creadoPor: actor.id,
      }),
    );
  });

  it('rechaza el registro si el animal no existe', async () => {
    const { service } = crearServicio({ animal: null });

    await expect(service.registrar(dto, actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rechaza el registro si el animal no está activo', async () => {
    const { service } = crearServicio({
      animal: { ...animalActivo, estado: 'INACTIVO' },
    });

    await expect(service.registrar(dto, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('acepta leche, huevos o carne para cualquier animal activo', async () => {
    const { service } = crearServicio({ animal: animalActivo });

    await expect(
      service.registrar(
        { ...dto, tipoProduccion: TipoProduccion.HUEVOS },
        actor,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        tipoProduccion: TipoProduccion.HUEVOS,
      }),
    );
  });

  it('consulta producción por animal, aplica el período y calcula totales', async () => {
    const registros = [
      registro({
        id: 2,
        tipoProduccion: TipoProduccion.LECHE,
        cantidad: 8,
        fecha: '2026-09-08',
      }),
      registro({
        id: 1,
        tipoProduccion: TipoProduccion.LECHE,
        cantidad: 4.5,
        fecha: '2026-09-01',
      }),
      registro({
        id: 3,
        tipoProduccion: TipoProduccion.CARNE,
        cantidad: 10,
        fecha: '2026-09-05',
      }),
    ];
    const { service, consulta } = crearServicio({
      animal: animalActivo,
      registros,
    });
    const filtros: ConsultarProduccionDto = {
      animalId: 1,
      desde: '2026-09-01',
    };

    const resultado = await service.consultar(filtros);

    expect(consulta.andWhere).toHaveBeenCalledWith(
      'produccion.fecha >= :desde',
      { desde: '2026-09-01' },
    );
    expect(resultado.registros).toHaveLength(3);
    expect(resultado.totales).toEqual([
      { tipoProduccion: TipoProduccion.CARNE, cantidad: 10 },
      { tipoProduccion: TipoProduccion.LECHE, cantidad: 12.5 },
    ]);
  });

  it('devuelve registros vacíos cuando no hay producción en el período', async () => {
    const { service } = crearServicio({
      animal: animalActivo,
      registros: [],
    });

    const resultado = await service.consultar({
      animalId: 1,
      desde: '2026-01-01',
    });

    expect(resultado.registros).toEqual([]);
    expect(resultado.totales).toEqual([]);
    expect(resultado.animal.id).toBe(1);
  });

  it('rechaza la consulta si el animal no existe', async () => {
    const { service } = crearServicio({ animal: null });

    await expect(service.consultar({ animalId: 99 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  function registro(parcial: {
    id: number;
    tipoProduccion: TipoProduccion;
    cantidad: number;
    fecha: string;
  }): ProduccionPecuaria {
    return {
      id: parcial.id,
      animal: animalActivo,
      tipoProduccion: parcial.tipoProduccion,
      cantidad: parcial.cantidad,
      fecha: parcial.fecha,
      creadoEn: new Date('2026-09-08T18:00:00.000Z'),
      creadoPor: actor.id,
    };
  }
});

function crearServicio(opciones: {
  animal: Animal | null;
  registros?: ProduccionPecuaria[];
  save?: (valor: unknown) => Promise<unknown>;
}) {
  const consulta = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(opciones.registros ?? []),
  };
  const animalesRepo = {
    findOne: jest.fn().mockResolvedValue(opciones.animal),
  };
  const produccionRepo = {
    create: jest.fn((_valor: unknown) => _valor),
    save: jest.fn(
      opciones.save ?? ((valor: unknown) => Promise.resolve(valor)),
    ),
    createQueryBuilder: jest.fn().mockReturnValue(consulta),
  };
  const service = new ProduccionService(
    animalesRepo as unknown as Repository<Animal>,
    produccionRepo as unknown as Repository<ProduccionPecuaria>,
  );

  return { service, produccionRepo, consulta };
}
