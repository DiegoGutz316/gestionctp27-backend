/**
 * Pruebas unitarias - CosechaService (soporte de /agricola/cosechas)
 */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  crearQueryBuilderSimulado,
  crearRepositorioSimulado,
} from '../../../../test/helpers/typeorm-mocks';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { CosechaService } from './cosecha.service';
import { UnidadMedida } from './enums/unidad-medida.enum';

const actor = {
  id: 'u-1',
  correo: 'a@x.cr',
  nombre: 'A',
  rol: RolUsuario.DOCENTE_AGRICOLA,
};
const cama = { id: 2, codigo: 'C-02', ubicacion: 'Invernadero 1' };
const siembra = (extra: Record<string, unknown> = {}) => ({
  id: 8,
  tipoCultivo: 'Tomate',
  fechaSiembra: '2026-09-10',
  finalizadaEn: null,
  cama,
  ...extra,
});
const dto = {
  siembraId: 8,
  fecha: '2026-09-25',
  cantidadObtenida: 12.5,
  unidadMedida: UnidadMedida.KG,
};

describe('CosechaService', () => {
  let siembras: ReturnType<typeof crearRepositorioSimulado>;
  let cosechas: ReturnType<typeof crearRepositorioSimulado>;
  let manager: { create: jest.Mock; save: jest.Mock };
  const siembraService = { cerrarCiclo: jest.fn() };
  let servicio: CosechaService;

  beforeEach(() => {
    jest.resetAllMocks();
    siembras = crearRepositorioSimulado();
    cosechas = crearRepositorioSimulado();
    manager = {
      create: jest.fn((_entidad: unknown, datos: object) => datos),
      save: jest.fn((e: object) =>
        Promise.resolve({ id: 1, creadoEn: new Date(), ...e }),
      ),
    };
    Object.assign(cosechas, {
      manager: {
        transaction: jest.fn((fn: (m: typeof manager) => unknown) =>
          fn(manager),
        ),
      },
    });
    servicio = new CosechaService(
      siembras as never,
      cosechas as never,
      siembraService as never,
    );
  });

  describe('registrar (POST)', () => {
    it('guarda la cosecha dentro de una transacción y devuelve el mapeo', async () => {
      siembras.findOne.mockResolvedValue(siembra());

      const r = await servicio.registrar(
        { ...dto, observaciones: 'Buena' },
        actor,
      );

      expect(manager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          fecha: '2026-09-25',
          cantidadObtenida: 12.5,
          unidadMedida: 'KG',
          observaciones: 'Buena',
          creadoPor: 'u-1',
        }),
      );
      expect(siembraService.cerrarCiclo).not.toHaveBeenCalled();
      expect(r).toMatchObject({
        siembra: { id: 8, fechaSiembra: '2026-09-10', cama },
        cantidadObtenida: 12.5,
      });
    });

    it('cerrarCiclo=true: cierra el ciclo y guarda cama y siembra en la misma transacción', async () => {
      const s = siembra();
      siembras.findOne.mockResolvedValue(s);

      await servicio.registrar({ ...dto, cerrarCiclo: true }, actor);

      expect(siembraService.cerrarCiclo).toHaveBeenCalledWith(s, 'u-1');
      expect(manager.save).toHaveBeenCalledWith(cama);
      expect(manager.save).toHaveBeenCalledWith(s);
    });

    it('404 si la siembra no existe', async () => {
      siembras.findOne.mockResolvedValue(null);
      await expect(servicio.registrar(dto, actor)).rejects.toThrow(
        new NotFoundException('La siembra seleccionada no existe.'),
      );
    });

    it('409 si la siembra está finalizada', async () => {
      siembras.findOne.mockResolvedValue(
        siembra({ finalizadaEn: '2026-09-20' }),
      );
      await expect(servicio.registrar(dto, actor)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(
        (cosechas as unknown as { manager: { transaction: jest.Mock } }).manager
          .transaction,
      ).not.toHaveBeenCalled();
    });

    it('400 si la fecha es anterior a la siembra', async () => {
      siembras.findOne.mockResolvedValue(siembra());
      await expect(
        servicio.registrar({ ...dto, fecha: '2026-09-01' }, actor),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(
        (cosechas as unknown as { manager: { transaction: jest.Mock } }).manager
          .transaction,
      ).not.toHaveBeenCalled();
    });
  });

  describe('consultar (GET)', () => {
    const fila = {
      id: 1,
      siembra: siembra(),
      fecha: '2026-09-25',
      cantidadObtenida: 12.5,
      unidadMedida: UnidadMedida.KG,
      observaciones: null,
      creadoEn: new Date(),
      creadoPor: 'u-1',
    };

    function armar(
      rawPorCultivo: unknown[] = [],
      rawPorUnidad: unknown[] = [],
    ) {
      const principal = crearQueryBuilderSimulado({
        getManyAndCount: [[fila], 1],
      });
      const totalUnidad = crearQueryBuilderSimulado({
        getRawMany: rawPorUnidad,
      });
      const totalCultivo = crearQueryBuilderSimulado({
        getRawMany: rawPorCultivo,
      });
      // Orden de llamadas: lista, totalizar (unidad), totalizarPorCultivo.
      cosechas.createQueryBuilder
        .mockReturnValueOnce(principal)
        .mockReturnValueOnce(totalUnidad)
        .mockReturnValueOnce(totalCultivo);
      return { principal, totalUnidad, totalCultivo };
    }

    it('devuelve datos paginados con totales por unidad y por cultivo', async () => {
      armar(
        [{ cultivo: 'Tomate', unidad: 'KG', cantidad: '30.50' }],
        [
          { unidad: 'UNIDADES', cantidad: '4' },
          { unidad: 'KG', cantidad: '30.50' },
        ],
      );

      const r = await servicio.consultar({ pagina: 1, limite: 10 });

      expect(r.datos).toHaveLength(1);
      expect(r.meta).toMatchObject({ total: 1, pagina: 1, limite: 10 });
      // Orden estable de unidades según el enum (KG antes que UNIDADES).
      expect(r.totales).toEqual([
        { unidadMedida: 'KG', cantidad: 30.5 },
        { unidadMedida: 'UNIDADES', cantidad: 4 },
      ]);
      expect(r.totalesPorCultivo).toEqual([
        { cultivo: 'Tomate', unidadMedida: 'KG', cantidad: 30.5 },
      ]);
    });

    it('sin cosechas: totales vacíos', async () => {
      armar();
      const r = await servicio.consultar({ pagina: 1, limite: 10 });
      expect(r.totales).toEqual([]);
      expect(r.totalesPorCultivo).toEqual([]);
    });

    it('ordena por fecha e id descendente', async () => {
      const { principal } = armar();
      await servicio.consultar({ pagina: 1, limite: 10 });
      expect(principal.orderBy).toHaveBeenCalledWith('cosecha.fecha', 'DESC');
      expect(principal.addOrderBy).toHaveBeenCalledWith('cosecha.id', 'DESC');
    });

    it('aplica filtros por cultivo, cama, ubicación y rango, también a los totales', async () => {
      const { principal, totalUnidad, totalCultivo } = armar();

      await servicio.consultar({
        cultivo: 'tom',
        camaId: 2,
        ubicacion: 'Invernadero 1',
        desde: '2026-09-01',
        hasta: '2026-09-30',
        pagina: 1,
        limite: 10,
      });

      for (const qb of [principal, totalUnidad, totalCultivo]) {
        expect(qb.andWhere).toHaveBeenCalledWith(
          expect.stringContaining('tipoCultivo'),
          { cultivo: '%tom%' },
        );
        expect(qb.andWhere).toHaveBeenCalledWith('cama.id = :camaId', {
          camaId: 2,
        });
        expect(qb.andWhere).toHaveBeenCalledWith('cosecha.fecha >= :desde', {
          desde: '2026-09-01',
        });
        expect(qb.andWhere).toHaveBeenCalledWith('cosecha.fecha <= :hasta', {
          hasta: '2026-09-30',
        });
      }
    });

    it('el filtro obsoleto «fecha» equivale a desde = hasta = esa fecha', async () => {
      const { principal } = armar();
      await servicio.consultar({
        fecha: '2026-09-18',
        pagina: 1,
        limite: 10,
      });
      expect(principal.andWhere).toHaveBeenCalledWith(
        'cosecha.fecha >= :desde',
        { desde: '2026-09-18' },
      );
      expect(principal.andWhere).toHaveBeenCalledWith(
        'cosecha.fecha <= :hasta',
        { hasta: '2026-09-18' },
      );
    });
  });
});
