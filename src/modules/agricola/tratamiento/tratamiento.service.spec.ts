/**
 * Pruebas unitarias - TratamientoService (soporte de /agricola/tratamientos)
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
import { ActividadAgricola } from './enums/actividad-agricola.enum';
import { TipoTratamiento } from './enums/tipo-tratamiento.enum';
import { UnidadTratamiento } from './enums/unidad-tratamiento.enum';
import { TratamientoService } from './tratamiento.service';

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

describe('TratamientoService', () => {
  let siembras: ReturnType<typeof crearRepositorioSimulado>;
  let tratamientos: ReturnType<typeof crearRepositorioSimulado>;
  let servicio: TratamientoService;

  beforeEach(() => {
    siembras = crearRepositorioSimulado();
    tratamientos = crearRepositorioSimulado();
    tratamientos.save.mockImplementation((t: object) =>
      Promise.resolve({ id: 1, creadoEn: new Date(), ...t }),
    );
    servicio = new TratamientoService(siembras as never, tratamientos as never);
  });

  describe('registrar (POST)', () => {
    it('tratamiento con producto: guarda tipo, producto, cantidad y unidad', async () => {
      siembras.findOne.mockResolvedValue(siembra());

      const r = await servicio.registrar(
        {
          siembraId: 8,
          fecha: '2026-09-17',
          actividad: ActividadAgricola.TRATAMIENTO,
          tipo: TipoTratamiento.FUNGICIDA,
          producto: 'Caldo bordelés',
          cantidad: 2.5,
          unidad: UnidadTratamiento.L,
          observaciones: 'Mañana',
        },
        actor,
      );

      expect(siembras.findOne).toHaveBeenCalledWith({
        where: { id: 8 },
        relations: { cama: true },
      });
      expect(tratamientos.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actividad: ActividadAgricola.TRATAMIENTO,
          tipo: TipoTratamiento.FUNGICIDA,
          producto: 'Caldo bordelés',
          cantidad: 2.5,
          unidad: UnidadTratamiento.L,
          observaciones: 'Mañana',
          creadoPor: 'u-1',
        }),
      );
      expect(r).toMatchObject({
        siembra: { id: 8, tipoCultivo: 'Tomate', cama },
        producto: 'Caldo bordelés',
        creadoPor: 'u-1',
      });
    });

    it.each([ActividadAgricola.RIEGO, ActividadAgricola.LIMPIEZA])(
      '%s ignora cualquier dato de producto que llegue',
      async (actividad) => {
        siembras.findOne.mockResolvedValue(siembra());

        await servicio.registrar(
          {
            siembraId: 8,
            fecha: '2026-09-17',
            actividad,
            tipo: TipoTratamiento.OTRO,
            producto: 'x',
            cantidad: 9,
            unidad: UnidadTratamiento.KG,
          },
          actor,
        );

        expect(tratamientos.create).toHaveBeenCalledWith(
          expect.objectContaining({
            tipo: null,
            producto: null,
            cantidad: null,
            unidad: null,
            observaciones: null,
          }),
        );
      },
    );

    it('404 si la siembra no existe', async () => {
      siembras.findOne.mockResolvedValue(null);
      await expect(
        servicio.registrar(
          {
            siembraId: 99,
            fecha: '2026-09-17',
            actividad: ActividadAgricola.RIEGO,
          },
          actor,
        ),
      ).rejects.toThrow(
        new NotFoundException('La siembra seleccionada no existe.'),
      );
      expect(tratamientos.save).not.toHaveBeenCalled();
    });

    it('409 si la siembra ya está finalizada', async () => {
      siembras.findOne.mockResolvedValue(
        siembra({ finalizadaEn: '2026-09-20' }),
      );
      await expect(
        servicio.registrar(
          {
            siembraId: 8,
            fecha: '2026-09-21',
            actividad: ActividadAgricola.RIEGO,
          },
          actor,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tratamientos.save).not.toHaveBeenCalled();
    });

    it('400 si la fecha es anterior a la siembra', async () => {
      siembras.findOne.mockResolvedValue(siembra());
      await expect(
        servicio.registrar(
          {
            siembraId: 8,
            fecha: '2026-09-09',
            actividad: ActividadAgricola.RIEGO,
          },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('acepta la fecha igual a la de siembra (límite)', async () => {
      siembras.findOne.mockResolvedValue(siembra());
      await expect(
        servicio.registrar(
          {
            siembraId: 8,
            fecha: '2026-09-10',
            actividad: ActividadAgricola.RIEGO,
          },
          actor,
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('consultar (GET)', () => {
    const fila = {
      id: 3,
      siembra: siembra(),
      actividad: ActividadAgricola.RIEGO,
      tipo: null,
      producto: null,
      fecha: '2026-09-17',
      cantidad: null,
      unidad: null,
      observaciones: null,
      creadoEn: new Date(),
      creadoPor: 'u-1',
    };

    it('solo siembras activas, ordenado por fecha e id descendente', async () => {
      const qb = crearQueryBuilderSimulado({ getMany: [fila] });
      tratamientos.createQueryBuilder.mockReturnValue(qb);

      const r = await servicio.consultar({});

      expect(qb.where).toHaveBeenCalledWith('siembra.finalizadaEn IS NULL');
      expect(qb.orderBy).toHaveBeenCalledWith('tratamiento.fecha', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('tratamiento.id', 'DESC');
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(r[0]).toMatchObject({ id: 3, siembra: { cama } });
    });

    it('aplica todos los filtros', async () => {
      const qb = crearQueryBuilderSimulado();
      tratamientos.createQueryBuilder.mockReturnValue(qb);

      await servicio.consultar({
        cultivo: 'tom',
        ubicacion: 'Invernadero 1',
        camaId: 2,
        tipo: TipoTratamiento.FUNGICIDA,
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('tipoCultivo'),
        { cultivo: '%tom%' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ubicacion'),
        { ubicacion: 'Invernadero 1' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith('cama.id = :camaId', {
        camaId: 2,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('tratamiento.tipo = :tipo', {
        tipo: TipoTratamiento.FUNGICIDA,
      });
    });
  });
});
