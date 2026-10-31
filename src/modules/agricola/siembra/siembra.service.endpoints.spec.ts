/**
 * Pruebas unitarias - SiembraService: reglas de negocio de
 * /agricola/siembras no cubiertas por siembra.service.spec.ts
 * (registrar: conflictos, finalizar, cerrarCiclo, detalle).
 */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { crearRepositorioSimulado } from '../../../../test/helpers/typeorm-mocks';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { EstadoCamaCultivo } from '../cama/enums/estado-cama-cultivo.enum';
import { ActividadAgricola } from '../tratamiento/enums/actividad-agricola.enum';
import { UnidadMedida } from '../cosecha/enums/unidad-medida.enum';
import { MotivoFinalizacionSiembra } from './enums/motivo-finalizacion.enum';
import { UnidadSiembra } from './enums/unidad-siembra.enum';
import { SiembraService } from './siembra.service';

const actor = {
  id: 'u-1',
  correo: 'a@x.cr',
  nombre: 'A',
  rol: RolUsuario.DOCENTE_AGRICOLA,
};
const camaBase = (extra: Record<string, unknown> = {}) => ({
  id: 3,
  codigo: 'C-03',
  ubicacion: 'Invernadero 1',
  estado: EstadoCamaCultivo.DISPONIBLE,
  ...extra,
});
const cultivo = { id: 7, nombre: 'Tomate', tipo: 'HORTALIZA', activo: true };
const siembraBase = (extra: Record<string, unknown> = {}) => ({
  id: 8,
  cama: camaBase({ estado: EstadoCamaCultivo.SEMBRADA }),
  tipoCultivo: 'Tomate',
  cultivo: null,
  fechaSiembra: '2026-09-10',
  cantidadSembrada: 25,
  unidadSembrada: UnidadSiembra.UNIDADES,
  finalizadaEn: null,
  motivoFinalizacion: null,
  motivoDetalle: null,
  creadoEn: new Date(),
  creadoPor: 'u-1',
  ...extra,
});
const dto = {
  camaId: 3,
  cultivoId: 7,
  fechaSiembra: '2026-09-15',
  cantidadSembrada: 25,
  unidadSembrada: UnidadSiembra.UNIDADES,
};

describe('SiembraService - reglas de negocio', () => {
  let camas: ReturnType<typeof crearRepositorioSimulado>;
  let siembras: ReturnType<typeof crearRepositorioSimulado>;
  let cuidados: ReturnType<typeof crearRepositorioSimulado>;
  let cosechas: ReturnType<typeof crearRepositorioSimulado>;
  const cultivoService = { obtener: jest.fn() };
  let servicio: SiembraService;

  beforeEach(() => {
    jest.resetAllMocks();
    camas = crearRepositorioSimulado();
    siembras = crearRepositorioSimulado();
    cuidados = crearRepositorioSimulado();
    cosechas = crearRepositorioSimulado();
    cultivoService.obtener.mockResolvedValue(cultivo);
    siembras.save.mockImplementation((s: object) =>
      Promise.resolve({ id: 8, creadoEn: new Date(), ...s }),
    );
    servicio = new SiembraService(
      camas as never,
      siembras as never,
      cuidados as never,
      cosechas as never,
      cultivoService as never,
    );
  });

  describe('registrar (POST)', () => {
    it('siembra: guarda el nombre histórico del cultivo y deja la cama SEMBRADA con auditoría', async () => {
      const cama = camaBase();
      camas.findOne.mockResolvedValue(cama);
      siembras.findOne.mockResolvedValue(null);

      const r = await servicio.registrar(dto, actor);

      expect(siembras.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoCultivo: 'Tomate',
          fechaSiembra: '2026-09-15',
          creadoPor: 'u-1',
          finalizadaEn: null,
        }),
      );
      expect(cama).toMatchObject({
        estado: EstadoCamaCultivo.SEMBRADA,
        actualizadoPor: 'u-1',
      });
      expect(camas.save).toHaveBeenCalledWith(cama);
      expect(r).toMatchObject({
        id: 8,
        tipoCultivo: 'Tomate',
        cama: { id: 3 },
      });
    });

    it('404 si la cama no existe', async () => {
      camas.findOne.mockResolvedValue(null);
      await expect(servicio.registrar(dto, actor)).rejects.toThrow(
        new NotFoundException('La cama de cultivo seleccionada no existe.'),
      );
    });

    it('404 si el cultivo no existe (se propaga el error del CultivoService)', async () => {
      camas.findOne.mockResolvedValue(camaBase());
      cultivoService.obtener.mockRejectedValue(
        new NotFoundException('El cultivo seleccionado no existe.'),
      );
      await expect(servicio.registrar(dto, actor)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it.each([
      EstadoCamaCultivo.SEMBRADA,
      EstadoCamaCultivo.EN_PREPARACION,
      EstadoCamaCultivo.EN_DESCANSO,
      EstadoCamaCultivo.MANTENIMIENTO,
    ])(
      '409 si la cama está %s (solo DISPONIBLE admite siembra)',
      async (estado) => {
        camas.findOne.mockResolvedValue(camaBase({ estado }));
        await expect(servicio.registrar(dto, actor)).rejects.toThrow(
          'La cama seleccionada ya tiene una siembra activa.',
        );
        expect(siembras.save).not.toHaveBeenCalled();
      },
    );

    it('409 si pese a estar DISPONIBLE existe una siembra activa en la cama', async () => {
      camas.findOne.mockResolvedValue(camaBase());
      siembras.findOne.mockResolvedValue(siembraBase());
      await expect(servicio.registrar(dto, actor)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('carrera: el índice único de siembra activa por cama se traduce a 409 y la cama no cambia', async () => {
      const cama = camaBase();
      camas.findOne.mockResolvedValue(cama);
      siembras.findOne.mockResolvedValue(null);
      siembras.save.mockRejectedValue(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('dup'), {
            code: '23505',
            constraint: 'siembras_cama_activa_unica',
          }),
        ),
      );

      await expect(servicio.registrar(dto, actor)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(cama.estado).toBe(EstadoCamaCultivo.DISPONIBLE);
      expect(camas.save).not.toHaveBeenCalled();
    });

    it('carrera: si borran el cultivo mientras se siembra, da 404 y no 500', async () => {
      const cama = camaBase();
      camas.findOne.mockResolvedValue(cama);
      siembras.findOne.mockResolvedValue(null);
      siembras.save.mockRejectedValue(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('fk'), {
            code: '23503',
            constraint: 'siembras_cultivo_fk',
          }),
        ),
      );

      await expect(servicio.registrar(dto, actor)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(servicio.registrar(dto, actor)).rejects.toThrow(
        'El cultivo seleccionado no existe.',
      );
      expect(cama.estado).toBe(EstadoCamaCultivo.DISPONIBLE);
      expect(camas.save).not.toHaveBeenCalled();
    });

    it('una clave foránea de otra columna no se disfraza de 404 y se propaga', async () => {
      camas.findOne.mockResolvedValue(camaBase());
      siembras.findOne.mockResolvedValue(null);
      const otro = new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('fk'), {
          code: '23503',
          constraint: 'siembras_cama_fk',
        }),
      );
      siembras.save.mockRejectedValue(otro);

      await expect(servicio.registrar(dto, actor)).rejects.toBe(otro);
    });

    it('un UNIQUE de otro índice no se confunde con cama ocupada y se propaga', async () => {
      camas.findOne.mockResolvedValue(camaBase());
      siembras.findOne.mockResolvedValue(null);
      const otro = new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('x'), { code: '23505', constraint: 'otra' }),
      );
      siembras.save.mockRejectedValue(otro);
      await expect(servicio.registrar(dto, actor)).rejects.toBe(otro);
    });

    // HALLAZGO H-03: el catálogo documenta que "un cultivo inactivo deja de
    // ofrecerse al sembrar", pero la API no lo impide. Este test fija el
    // comportamiento ACTUAL; si se corrige, debe cambiar a esperar un 409/400.
    it('H-03 (comportamiento actual): permite sembrar un cultivo desactivado', async () => {
      cultivoService.obtener.mockResolvedValue({ ...cultivo, activo: false });
      camas.findOne.mockResolvedValue(camaBase());
      siembras.findOne.mockResolvedValue(null);
      await expect(servicio.registrar(dto, actor)).resolves.toMatchObject({
        tipoCultivo: 'Tomate',
      });
    });
  });

  describe('finalizar (PATCH :id/finalizar)', () => {
    it('cierra el ciclo: fecha de hoy, motivo, detalle y libera la cama', async () => {
      const s = siembraBase();
      siembras.findOne.mockResolvedValue(s);

      const r = await servicio.finalizar(
        8,
        { motivo: MotivoFinalizacionSiembra.PLAGA, detalle: 'Mosca blanca' },
        actor,
      );

      expect(s.finalizadaEn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s).toMatchObject({
        motivoFinalizacion: 'PLAGA',
        motivoDetalle: 'Mosca blanca',
      });
      expect(s.cama).toMatchObject({
        estado: EstadoCamaCultivo.DISPONIBLE,
        actualizadoPor: 'u-1',
      });
      expect(camas.save).toHaveBeenCalledWith(s.cama);
      expect(r.motivoFinalizacion).toBe('PLAGA');
    });

    it('motivo OTRO exige detalle: 400 sin tocar la BD', async () => {
      await expect(
        servicio.finalizar(
          8,
          { motivo: MotivoFinalizacionSiembra.OTRO },
          actor,
        ),
      ).rejects.toThrow('Describa el motivo de finalización.');
      expect(siembras.findOne).not.toHaveBeenCalled();
    });

    it('motivo OTRO con detalle: permitido', async () => {
      siembras.findOne.mockResolvedValue(siembraBase());
      await expect(
        servicio.finalizar(
          8,
          { motivo: MotivoFinalizacionSiembra.OTRO, detalle: 'Rotación' },
          actor,
        ),
      ).resolves.toBeDefined();
    });

    it('detalle ausente se guarda como null', async () => {
      const s = siembraBase();
      siembras.findOne.mockResolvedValue(s);
      await servicio.finalizar(
        8,
        { motivo: MotivoFinalizacionSiembra.CLIMA },
        actor,
      );
      expect(s.motivoDetalle).toBeNull();
    });

    it('404 si la siembra no existe', async () => {
      siembras.findOne.mockResolvedValue(null);
      await expect(
        servicio.finalizar(
          8,
          { motivo: MotivoFinalizacionSiembra.PERDIDA },
          actor,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('409 si ya estaba finalizada (no se puede finalizar dos veces)', async () => {
      siembras.findOne.mockResolvedValue(
        siembraBase({ finalizadaEn: '2026-09-20' }),
      );
      await expect(
        servicio.finalizar(
          8,
          { motivo: MotivoFinalizacionSiembra.PERDIDA },
          actor,
        ),
      ).rejects.toThrow('Esta siembra ya fue finalizada.');
      expect(camas.save).not.toHaveBeenCalled();
    });
  });

  describe('cerrarCiclo', () => {
    it('sin motivo (cierre por cosecha): motivo y detalle quedan null', () => {
      const s = siembraBase();
      servicio.cerrarCiclo(s as never, 'u-9');
      expect(s).toMatchObject({
        motivoFinalizacion: null,
        motivoDetalle: null,
      });
      expect(s.cama.estado).toBe(EstadoCamaCultivo.DISPONIBLE);
      expect(s.cama).toMatchObject({ actualizadoPor: 'u-9' });
    });

    it('409 si ya estaba finalizada', () => {
      expect(() =>
        servicio.cerrarCiclo(
          siembraBase({ finalizadaEn: '2026-09-20' }) as never,
          'u-9',
        ),
      ).toThrow(ConflictException);
    });
  });

  describe('obtenerDetalle (GET :id)', () => {
    it('404 si la siembra no existe (no consulta cuidados ni cosechas)', async () => {
      siembras.findOne.mockResolvedValue(null);
      await expect(servicio.obtenerDetalle(8)).rejects.toThrow(
        new NotFoundException('La siembra no existe.'),
      );
      expect(cuidados.find).not.toHaveBeenCalled();
      expect(cosechas.find).not.toHaveBeenCalled();
    });

    it('arma historial con totales de producción por unidad y conteo de cuidados por actividad', async () => {
      const s = siembraBase();
      siembras.findOne.mockResolvedValue(s);
      const cama = { id: 3, codigo: 'C-03', ubicacion: 'Invernadero 1' };
      const sem = {
        id: 8,
        tipoCultivo: 'Tomate',
        fechaSiembra: '2026-09-10',
        cama,
      };
      cuidados.find.mockResolvedValue([
        {
          id: 1,
          siembra: sem,
          actividad: ActividadAgricola.RIEGO,
          tipo: null,
          producto: null,
          fecha: '2026-09-12',
          cantidad: null,
          unidad: null,
          observaciones: null,
          creadoEn: new Date(),
          creadoPor: 'u-1',
        },
        {
          id: 2,
          siembra: sem,
          actividad: ActividadAgricola.RIEGO,
          tipo: null,
          producto: null,
          fecha: '2026-09-13',
          cantidad: null,
          unidad: null,
          observaciones: null,
          creadoEn: new Date(),
          creadoPor: 'u-1',
        },
        {
          id: 3,
          siembra: sem,
          actividad: ActividadAgricola.LIMPIEZA,
          tipo: null,
          producto: null,
          fecha: '2026-09-14',
          cantidad: null,
          unidad: null,
          observaciones: null,
          creadoEn: new Date(),
          creadoPor: 'u-1',
        },
      ]);
      const cosecha = (
        id: number,
        cantidadObtenida: number,
        unidadMedida: UnidadMedida,
      ) => ({
        id,
        siembra: sem,
        fecha: '2026-09-25',
        cantidadObtenida,
        unidadMedida,
        observaciones: null,
        creadoEn: new Date(),
        creadoPor: 'u-1',
      });
      cosechas.find.mockResolvedValue([
        cosecha(1, 10.1, UnidadMedida.KG),
        cosecha(2, 5.25, UnidadMedida.KG),
        cosecha(3, 4, UnidadMedida.UNIDADES),
      ]);

      const r = await servicio.obtenerDetalle(8);

      expect(r.siembra.id).toBe(8);
      expect(r.cuidados).toHaveLength(3);
      expect(r.cosechas).toHaveLength(3);
      expect(r.produccion).toEqual([
        { unidadMedida: 'KG', cantidad: 15.35 },
        { unidadMedida: 'UNIDADES', cantidad: 4 },
      ]);
      expect(r.cuidadosPorActividad).toEqual([
        { actividad: 'RIEGO', cantidad: 2 },
        { actividad: 'LIMPIEZA', cantidad: 1 },
      ]);
    });

    it('siembra sin cuidados ni cosechas: listas y totales vacíos', async () => {
      siembras.findOne.mockResolvedValue(siembraBase());
      cuidados.find.mockResolvedValue([]);
      cosechas.find.mockResolvedValue([]);
      const r = await servicio.obtenerDetalle(8);
      expect(r).toMatchObject({
        cuidados: [],
        cosechas: [],
        produccion: [],
        cuidadosPorActividad: [],
      });
    });
  });
});
