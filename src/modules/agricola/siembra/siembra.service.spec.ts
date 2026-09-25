import { NotFoundException } from '@nestjs/common';

import { EstadoCamaCultivo } from '../cama/enums/estado-cama-cultivo.enum';
import type { Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { CamaCultivo } from '../cama/entities/cama-cultivo.entity';
import type { RegistrarSiembraDto } from './dto/registrar-siembra.dto';
import { Siembra } from './entities/siembra.entity';
import { SiembraService } from './siembra.service';

describe('SiembraService', () => {
  const actor: UsuarioAutenticado = {
    id: 'b62082bb-17b7-49c1-994b-538d77bc814a',
    correo: 'docente@ctp.test',
    nombre: 'Docente agrícola',
    rol: RolUsuario.DOCENTE_AGRICOLA,
  };
  const cama = {
    id: 3,
    codigo: 'CAMA-003',
    ubicacion: 'Invernadero',
    estado: EstadoCamaCultivo.DISPONIBLE,
  } as CamaCultivo;
  const dto: RegistrarSiembraDto = {
    camaId: 3,
    tipoCultivo: 'Tomate',
    fechaSiembra: '2026-09-15',
    cantidadSembrada: 25.5,
  };

  it('registra la siembra asociada a la cama y al usuario', async () => {
    const { service, siembrasRepo } = crearServicio({ cama });

    const resultado = await service.registrar(dto, actor);

    expect(siembrasRepo.create).toHaveBeenCalledWith({
      cama,
      tipoCultivo: 'Tomate',
      fechaSiembra: '2026-09-15',
      cantidadSembrada: 25.5,
      creadoPor: actor.id,
      finalizadaEn: null,
    });
    expect(cama.estado).toBe('SEMBRADA');
    expect(resultado.cama).toEqual({
      id: 3,
      codigo: 'CAMA-003',
      ubicacion: 'Invernadero',
    });
    expect(resultado.tipoCultivo).toBe('Tomate');
    expect(resultado.creadoPor).toBe(actor.id);
  });

  it('rechaza el registro cuando la cama no existe', async () => {
    const { service, siembrasRepo } = crearServicio({ cama: null });

    await expect(service.registrar(dto, actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(siembrasRepo.save).not.toHaveBeenCalled();
  });

  it('consulta todas las siembras con su cama', async () => {
    const registro = crearRegistro(cama, actor.id);
    const { service, consulta } = crearServicio({
      cama,
      registros: [registro],
    });

    const resultado = await service.consultar({});

    expect(consulta.innerJoinAndSelect).toHaveBeenCalledWith(
      'siembra.cama',
      'cama',
    );
    expect(resultado).toHaveLength(1);
    expect(resultado[0].cama.codigo).toBe('CAMA-003');
  });

  it('filtra por cultivo y fecha', async () => {
    const { service, consulta } = crearServicio({ cama, registros: [] });

    await service.consultar({ cultivo: 'tom', fecha: '2026-09-15' });

    expect(consulta.andWhere).toHaveBeenCalledWith(
      'lower(siembra.tipoCultivo) LIKE lower(:cultivo)',
      { cultivo: '%tom%' },
    );
    expect(consulta.andWhere).toHaveBeenCalledWith(
      'siembra.fechaSiembra = :fecha',
      { fecha: '2026-09-15' },
    );
  });

  it('devuelve un listado vacío cuando no hay coincidencias', async () => {
    const { service } = crearServicio({ cama, registros: [] });

    await expect(service.consultar({ cultivo: 'Café' })).resolves.toEqual([]);
  });
});

function crearRegistro(cama: CamaCultivo, creadoPor: string): Siembra {
  return {
    id: 10,
    cama,
    tipoCultivo: 'Tomate',
    fechaSiembra: '2026-09-15',
    cantidadSembrada: 25.5,
    creadoEn: new Date('2026-09-15T18:00:00.000Z'),
    creadoPor,
  };
}

function crearServicio(opciones: {
  cama: CamaCultivo | null;
  registros?: Siembra[];
}) {
  const consulta = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(opciones.registros ?? []),
  };
  const camasRepo = {
    findOne: jest.fn().mockResolvedValue(opciones.cama),
    save: jest.fn((valor: CamaCultivo) => Promise.resolve(valor)),
  };
  const siembrasRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((valor: object) => valor),
    save: jest.fn((valor: object) =>
      Promise.resolve({
        id: 10,
        ...valor,
        creadoEn: new Date('2026-09-15T18:00:00.000Z'),
      }),
    ),
    createQueryBuilder: jest.fn().mockReturnValue(consulta),
  };
  const service = new SiembraService(
    camasRepo as unknown as Repository<CamaCultivo>,
    siembrasRepo as unknown as Repository<Siembra>,
  );

  return { service, siembrasRepo, consulta };
}
