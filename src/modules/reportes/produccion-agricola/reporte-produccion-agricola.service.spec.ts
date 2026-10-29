import type { Repository } from 'typeorm';

import { Cosecha } from '../../agricola/cosecha/entities/cosecha.entity';
import { UnidadMedida } from '../../agricola/cosecha/enums/unidad-medida.enum';
import { Siembra } from '../../agricola/siembra/entities/siembra.entity';
import { TratamientoAgricola } from '../../agricola/tratamiento/entities/tratamiento-agricola.entity';

import { ConsultarReporteProduccionAgricolaDto } from './dto/consultar-reporte-produccion-agricola.dto';
import { ReporteProduccionAgricolaService } from './reporte-produccion-agricola.service';

describe('ReporteProduccionAgricolaService', () => {
  const cama = { id: 1, codigo: 'CAMA-001', ubicacion: 'Invernadero 1' };

  const siembra = {
    id: 1,
    cama,
    tipoCultivo: 'Tomate',
    fechaSiembra: '2026-09-01',
    cantidadSembrada: 50,
    creadoEn: new Date('2026-09-01T12:00:00.000Z'),
    creadoPor: 'actor-1',
  } as Siembra;

  const cosecha = {
    id: 1,
    siembra,
    fecha: '2026-09-10',
    cantidadObtenida: 20,
    unidadMedida: UnidadMedida.KG,
    observaciones: null,
    creadoEn: new Date('2026-09-10T12:00:00.000Z'),
    creadoPor: 'actor-1',
  } as Cosecha;

  const tratamiento = {
    id: 1,
    siembra,
    producto: 'Fertilizante foliar',
    fecha: '2026-09-05',
    cantidad: 2,
    observaciones: null,
    creadoEn: new Date('2026-09-05T12:00:00.000Z'),
    creadoPor: 'actor-1',
  } as TratamientoAgricola;

  const dto: ConsultarReporteProduccionAgricolaDto = {
    fechaInicio: '2026-09-01',
    fechaFin: '2026-09-20',
  };

  it('genera el reporte con siembras, cosechas y tratamientos', async () => {
    const { service } = crearServicio({
      siembras: [siembra],
      cosechas: [cosecha],
      tratamientos: [tratamiento],
      totalesRaw: [],
    });

    const resultado = await service.generar(dto);

    expect(resultado.siembras).toHaveLength(1);
    expect(resultado.cosechas).toHaveLength(1);
    expect(resultado.tratamientos).toHaveLength(1);
  });

  it('trae la cama de cada tratamiento, que el mapeo necesita', async () => {
    // Con `innerJoin` a secas la cama filtra pero no se trae, y
    // `mapearTratamiento` la lee: el reporte respondía 500 en cuanto el
    // período incluía un tratamiento.
    const { service, tratamientoConsulta } = crearServicio({
      siembras: [],
      cosechas: [],
      tratamientos: [tratamiento],
      totalesRaw: [],
    });

    const resultado = await service.generar(dto);

    expect(tratamientoConsulta.innerJoinAndSelect).toHaveBeenCalledWith(
      'siembra.cama',
      'cama',
    );
    expect(tratamientoConsulta.innerJoin).not.toHaveBeenCalledWith(
      'siembra.cama',
      'cama',
    );
    expect(resultado.tratamientos[0].siembra.cama.id).toBe(cama.id);
  });

  it('filtra por cultivo en las tres consultas', async () => {
    const { service, siembraConsulta, cosechaConsulta, tratamientoConsulta } =
      crearServicio({
        siembras: [],
        cosechas: [],
        tratamientos: [],
        totalesRaw: [],
      });

    await service.generar({ ...dto, cultivo: 'Tomate' });

    expect(siembraConsulta.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('siembra.tipoCultivo'),
      { cultivo: '%Tomate%' },
    );
    expect(cosechaConsulta.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('siembra.tipoCultivo'),
      { cultivo: '%Tomate%' },
    );
    expect(tratamientoConsulta.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('siembra.tipoCultivo'),
      { cultivo: '%Tomate%' },
    );
  });

  it('filtra por cama en las tres consultas', async () => {
    const { service, siembraConsulta, cosechaConsulta, tratamientoConsulta } =
      crearServicio({
        siembras: [],
        cosechas: [],
        tratamientos: [],
        totalesRaw: [],
      });

    await service.generar({ ...dto, camaId: 1 });

    expect(siembraConsulta.andWhere).toHaveBeenCalledWith('cama.id = :camaId', {
      camaId: 1,
    });
    expect(cosechaConsulta.andWhere).toHaveBeenCalledWith('cama.id = :camaId', {
      camaId: 1,
    });
    expect(tratamientoConsulta.andWhere).toHaveBeenCalledWith(
      'cama.id = :camaId',
      { camaId: 1 },
    );
  });

  it('filtra siembras por fechaSiembra dentro del rango', async () => {
    const { service, siembraConsulta } = crearServicio({
      siembras: [],
      cosechas: [],
      tratamientos: [],
      totalesRaw: [],
    });

    await service.generar(dto);

    expect(siembraConsulta.where).toHaveBeenCalledWith(
      'siembra.fechaSiembra >= :fechaInicio',
      { fechaInicio: '2026-09-01' },
    );
    expect(siembraConsulta.andWhere).toHaveBeenCalledWith(
      'siembra.fechaSiembra <= :fechaFin',
      { fechaFin: '2026-09-20' },
    );
  });

  it('filtra cosechas por Cosecha.fecha dentro del rango', async () => {
    const { service, cosechaConsulta } = crearServicio({
      siembras: [],
      cosechas: [],
      tratamientos: [],
      totalesRaw: [],
    });

    await service.generar(dto);

    expect(cosechaConsulta.andWhere).toHaveBeenCalledWith(
      'cosecha.fecha >= :fechaInicio',
      { fechaInicio: '2026-09-01' },
    );
    expect(cosechaConsulta.andWhere).toHaveBeenCalledWith(
      'cosecha.fecha <= :fechaFin',
      { fechaFin: '2026-09-20' },
    );
  });

  it('filtra tratamientos por fecha dentro del rango', async () => {
    const { service, tratamientoConsulta } = crearServicio({
      siembras: [],
      cosechas: [],
      tratamientos: [],
      totalesRaw: [],
    });

    await service.generar(dto);

    expect(tratamientoConsulta.where).toHaveBeenCalledWith(
      'tratamiento.fecha >= :fechaInicio',
      { fechaInicio: '2026-09-01' },
    );
    expect(tratamientoConsulta.andWhere).toHaveBeenCalledWith(
      'tratamiento.fecha <= :fechaFin',
      { fechaFin: '2026-09-20' },
    );
  });

  it('devuelve secciones y totales vacíos cuando no hay datos en el período', async () => {
    const { service } = crearServicio({
      siembras: [],
      cosechas: [],
      tratamientos: [],
      totalesRaw: [],
    });

    const resultado = await service.generar(dto);

    expect(resultado).toEqual({
      siembras: [],
      cosechas: [],
      tratamientos: [],
      totales: { cosechas: [] },
    });
  });

  it('calcula el total de cosechas agrupado por unidad de medida', async () => {
    const { service } = crearServicio({
      siembras: [],
      cosechas: [],
      tratamientos: [],
      totalesRaw: [
        { unidad: UnidadMedida.KG, cantidad: '25' },
        { unidad: UnidadMedida.UNIDADES, cantidad: '80' },
      ],
    });

    const resultado = await service.generar(dto);

    expect(resultado.totales.cosechas).toEqual([
      { unidadMedida: UnidadMedida.KG, cantidad: 25 },
      { unidadMedida: UnidadMedida.UNIDADES, cantidad: 80 },
    ]);
  });

  it('mantiene los totales de cosecha separados por unidad de medida', async () => {
    const { service } = crearServicio({
      siembras: [],
      cosechas: [],
      tratamientos: [],
      totalesRaw: [{ unidad: UnidadMedida.KG, cantidad: '25' }],
    });

    const resultado = await service.generar(dto);

    expect(resultado.totales.cosechas).toEqual([
      { unidadMedida: UnidadMedida.KG, cantidad: 25 },
    ]);
  });
});

function crearServicio(opciones: {
  siembras: Siembra[];
  cosechas: Cosecha[];
  tratamientos: TratamientoAgricola[];
  totalesRaw: { unidad: UnidadMedida; cantidad: string }[];
}) {
  const siembraConsulta = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(opciones.siembras),
  };
  const siembrasRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(siembraConsulta),
  };

  const cosechaListado = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(opciones.cosechas),
  };
  const cosechaTotal = {
    innerJoin: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(opciones.totalesRaw),
  };
  const cosechasRepo = {
    createQueryBuilder: jest
      .fn()
      .mockReturnValueOnce(cosechaListado)
      .mockReturnValueOnce(cosechaTotal),
  };

  const tratamientoConsulta = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(opciones.tratamientos),
  };
  const tratamientosRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(tratamientoConsulta),
  };

  const service = new ReporteProduccionAgricolaService(
    siembrasRepo as unknown as Repository<Siembra>,
    cosechasRepo as unknown as Repository<Cosecha>,
    tratamientosRepo as unknown as Repository<TratamientoAgricola>,
  );

  return {
    service,
    siembraConsulta,
    cosechaConsulta: cosechaListado,
    cosechaTotalConsulta: cosechaTotal,
    tratamientoConsulta,
  };
}
