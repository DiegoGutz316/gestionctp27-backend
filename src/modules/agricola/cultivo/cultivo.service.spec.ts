/**
 * Pruebas unitarias - CultivoService (soporte de /agricola/cultivos)
 */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import {
  crearQueryBuilderSimulado,
  crearRepositorioSimulado,
} from '../../../../test/helpers/typeorm-mocks';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { TipoCultivo } from './enums/tipo-cultivo.enum';
import { CultivoService, normalizarNombre } from './cultivo.service';

const actor = {
  id: 'u-1',
  correo: 'a@x.cr',
  nombre: 'A',
  rol: RolUsuario.DOCENTE_AGRICOLA,
};
const cultivo = (extra: Record<string, unknown> = {}) => ({
  id: 4,
  nombre: 'Tomate',
  nombreNormalizado: 'tomate',
  tipo: TipoCultivo.HORTALIZA,
  descripcion: null,
  activo: true,
  creadoEn: new Date('2026-01-01'),
  creadoPor: 'u-1',
  ...extra,
});
const duplicado = () =>
  new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('dup'), { code: '23505' }),
  );

describe('normalizarNombre', () => {
  it.each([
    ['Tomate', 'tomate'],
    ['  Tomate   Cherry ', 'tomate cherry'],
    ['Plátano', 'platano'],
    ['ÑAME', 'name'],
    ['Cilantro  Ácido', 'cilantro acido'],
  ])('%j -> %j', (entrada, esperado) => {
    expect(normalizarNombre(entrada)).toBe(esperado);
  });
});

describe('CultivoService', () => {
  let cultivos: ReturnType<typeof crearRepositorioSimulado>;
  let siembras: ReturnType<typeof crearRepositorioSimulado>;
  let servicio: CultivoService;

  beforeEach(() => {
    cultivos = crearRepositorioSimulado();
    siembras = crearRepositorioSimulado();
    servicio = new CultivoService(cultivos as never, siembras as never);
  });

  describe('registrar (POST)', () => {
    it('guarda con nombre normalizado, activo=true por defecto y autor; no expone nombreNormalizado', async () => {
      cultivos.save.mockImplementation((c: object) =>
        Promise.resolve({ id: 9, creadoEn: new Date(), ...c }),
      );

      const r = await servicio.registrar(
        { nombre: 'Plátano Maduro', tipo: TipoCultivo.FRUTA },
        actor,
      );

      expect(cultivos.create).toHaveBeenCalledWith({
        nombre: 'Plátano Maduro',
        nombreNormalizado: 'platano maduro',
        tipo: TipoCultivo.FRUTA,
        descripcion: null,
        activo: true,
        creadoPor: 'u-1',
      });
      expect(r).toMatchObject({ id: 9, nombre: 'Plátano Maduro' });
      expect(r).not.toHaveProperty('nombreNormalizado');
    });

    it('respeta activo=false y la descripción', async () => {
      await servicio.registrar(
        {
          nombre: 'X',
          tipo: TipoCultivo.OTRO,
          activo: false,
          descripcion: 'd',
        },
        actor,
      );
      expect(cultivos.create).toHaveBeenCalledWith(
        expect.objectContaining({ activo: false, descripcion: 'd' }),
      );
    });

    it('nombre duplicado (UNIQUE): 409 con el nombre en el mensaje', async () => {
      cultivos.save.mockRejectedValue(duplicado());
      await expect(
        servicio.registrar(
          { nombre: 'Tomate', tipo: TipoCultivo.HORTALIZA },
          actor,
        ),
      ).rejects.toThrow(
        new ConflictException(
          'Ya existe un cultivo registrado con el nombre "Tomate".',
        ),
      );
    });

    it('otros errores se propagan', async () => {
      const fallo = new Error('BD caída');
      cultivos.save.mockRejectedValue(fallo);
      await expect(
        servicio.registrar({ nombre: 'T', tipo: TipoCultivo.OTRO }, actor),
      ).rejects.toBe(fallo);
    });
  });

  describe('consultar (GET)', () => {
    it('sin filtros: ordena por nombre y no agrega condiciones', async () => {
      const qb = crearQueryBuilderSimulado({
        getMany: [cultivo(), cultivo({ id: 5 })],
      });
      cultivos.createQueryBuilder.mockReturnValue(qb);

      const r = await servicio.consultar({});

      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(qb.orderBy).toHaveBeenCalledWith('cultivo.nombre', 'ASC');
      expect(r).toHaveLength(2);
      expect(r[0]).not.toHaveProperty('nombreNormalizado');
    });

    it('con soloActivos, tipo y búsqueda (normalizada, sin tildes)', async () => {
      const qb = crearQueryBuilderSimulado();
      cultivos.createQueryBuilder.mockReturnValue(qb);

      await servicio.consultar({
        soloActivos: true,
        tipo: TipoCultivo.FRUTA,
        q: ' Plátano ',
      });

      expect(qb.andWhere).toHaveBeenCalledWith('cultivo.activo = true');
      expect(qb.andWhere).toHaveBeenCalledWith('cultivo.tipo = :tipo', {
        tipo: TipoCultivo.FRUTA,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'cultivo.nombreNormalizado LIKE :q',
        { q: '%platano%' },
      );
    });

    it('los comodines de LIKE en la búsqueda se buscan literalmente', async () => {
      const qb = crearQueryBuilderSimulado();
      cultivos.createQueryBuilder.mockReturnValue(qb);

      await servicio.consultar({ q: '100% ma_z' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'cultivo.nombreNormalizado LIKE :q',
        { q: String.raw`%100\% ma\_z%` },
      );
    });

    it('soloActivos=false no filtra', async () => {
      const qb = crearQueryBuilderSimulado();
      cultivos.createQueryBuilder.mockReturnValue(qb);
      await servicio.consultar({ soloActivos: false });
      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('obtener (GET :id)', () => {
    it('devuelve la entidad', async () => {
      cultivos.findOne.mockResolvedValue(cultivo());
      expect(await servicio.obtener(4)).toMatchObject({ id: 4 });
      expect(cultivos.findOne).toHaveBeenCalledWith({ where: { id: 4 } });
    });

    it('404 si no existe', async () => {
      cultivos.findOne.mockResolvedValue(null);
      await expect(servicio.obtener(99)).rejects.toThrow(
        new NotFoundException('El cultivo seleccionado no existe.'),
      );
    });
  });

  describe('editar (PATCH :id)', () => {
    it('edición parcial: solo cambia los campos enviados', async () => {
      cultivos.findOne.mockResolvedValue(cultivo());

      const r = await servicio.editar(4, { activo: false });

      expect(cultivos.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Tomate',
          nombreNormalizado: 'tomate',
          activo: false,
        }),
      );
      expect(r.activo).toBe(false);
    });

    it('cambiar el nombre recalcula nombreNormalizado', async () => {
      cultivos.findOne.mockResolvedValue(cultivo());
      await servicio.editar(4, { nombre: 'Tomate Cherry' });
      expect(cultivos.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Tomate Cherry',
          nombreNormalizado: 'tomate cherry',
        }),
      );
    });

    it('descripcion=null/"" explícita limpia la descripción; omitida la conserva', async () => {
      cultivos.findOne.mockResolvedValue(cultivo({ descripcion: 'vieja' }));
      await servicio.editar(4, {});
      expect(cultivos.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ descripcion: 'vieja' }),
      );

      cultivos.findOne.mockResolvedValue(cultivo({ descripcion: 'vieja' }));
      await servicio.editar(4, { descripcion: null });
      expect(cultivos.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ descripcion: null }),
      );
    });

    it('404 si no existe', async () => {
      cultivos.findOne.mockResolvedValue(null);
      await expect(servicio.editar(9, { activo: true })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('nombre repetido: 409', async () => {
      cultivos.findOne.mockResolvedValue(cultivo());
      cultivos.save.mockRejectedValue(duplicado());
      await expect(
        servicio.editar(4, { nombre: 'Maíz' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('eliminar (DELETE :id)', () => {
    it('sin siembras: borra el cultivo', async () => {
      cultivos.findOne.mockResolvedValue(cultivo());
      siembras.count.mockResolvedValue(0);

      await servicio.eliminar(4);

      expect(siembras.count).toHaveBeenCalledWith({
        where: { cultivo: { id: 4 } },
      });
      expect(cultivos.delete).toHaveBeenCalledWith(4);
    });

    it.each([
      [1, '1 siembra registrada'],
      [3, '3 siembras registradas'],
    ])('con %i siembras: 409 y no borra', async (n, texto) => {
      cultivos.findOne.mockResolvedValue(cultivo());
      siembras.count.mockResolvedValue(n);

      await expect(servicio.eliminar(4)).rejects.toThrow(texto);
      expect(cultivos.delete).not.toHaveBeenCalled();
    });

    // Carrera: alguien confirma una siembra entre el conteo y el borrado.
    it('si la siembra aparece en el medio: 409, no 500', async () => {
      cultivos.findOne.mockResolvedValue(cultivo());
      siembras.count.mockResolvedValue(0);
      cultivos.delete.mockRejectedValue(
        new QueryFailedError('DELETE', [], {
          code: '23503',
          constraint: 'siembras_cultivo_fk',
        } as unknown as Error),
      );

      await expect(servicio.eliminar(4)).rejects.toBeInstanceOf(
        ConflictException,
      );
      await expect(servicio.eliminar(4)).rejects.toThrow(
        'tiene siembras registradas',
      );
    });

    it('otra violación de clave foránea no se disfraza de 409', async () => {
      cultivos.findOne.mockResolvedValue(cultivo());
      siembras.count.mockResolvedValue(0);
      const otro = new QueryFailedError('DELETE', [], {
        code: '23503',
        constraint: 'otra_fk',
      } as unknown as Error);
      cultivos.delete.mockRejectedValue(otro);

      await expect(servicio.eliminar(4)).rejects.toBe(otro);
    });

    it('404 si no existe', async () => {
      cultivos.findOne.mockResolvedValue(null);
      await expect(servicio.eliminar(4)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(siembras.count).not.toHaveBeenCalled();
    });
  });
});
