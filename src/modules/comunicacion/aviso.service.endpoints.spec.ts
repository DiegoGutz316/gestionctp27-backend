/**
 * Pruebas unitarias - AvisoService: reglas de negocio de los endpoints de
 * /comunicacion/avisos no cubiertas por aviso.service.spec.ts
 * (registrar, consultar, consultarPublicos, obtener, flyers).
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { crearRepositorioSimulado } from '../../../test/helpers/typeorm-mocks';
import { RolUsuario } from '../usuarios/enums/rol-usuario.enum';
import { AvisoService } from './aviso.service';
import { CategoriaAviso } from './enums/categoria-aviso.enum';
import { EstadoAviso } from './enums/estado-aviso.enum';

const actor = {
  id: 'u-1',
  correo: 'a@x.cr',
  nombre: 'A',
  rol: RolUsuario.ADMINISTRADOR,
};
const aviso = (extra: Record<string, unknown> = {}) => ({
  id: 3,
  titulo: 'Feria',
  descripcion: 'En el gimnasio',
  fecha: '2026-11-05',
  categoria: CategoriaAviso.EVENTOS,
  estado: EstadoAviso.ACTIVO,
  creadoEn: new Date('2026-10-01T00:00:00Z'),
  creadoPor: 'u-1',
  actualizadoEn: null,
  actualizadoPor: null,
  flyerTipo: null,
  ...extra,
});

describe('AvisoService - reglas de negocio', () => {
  let repo: ReturnType<typeof crearRepositorioSimulado>;
  let servicio: AvisoService;

  beforeEach(() => {
    repo = crearRepositorioSimulado();
    servicio = new AvisoService(repo as never);
  });

  describe('registrar (POST)', () => {
    const dto = {
      titulo: 'Feria',
      descripcion: 'x',
      categoria: CategoriaAviso.EVENTOS,
      fecha: '2026-11-05',
    };

    it('publica ACTIVO por defecto y registra al autor', async () => {
      const r = await servicio.registrar(dto, actor);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...dto,
          estado: EstadoAviso.ACTIVO,
          creadoPor: 'u-1',
          actualizadoEn: null,
          actualizadoPor: null,
        }),
      );
      expect(r).toMatchObject({ titulo: 'Feria', tieneFlyer: false });
    });

    it('respeta el estado indicado', async () => {
      await servicio.registrar({ ...dto, estado: EstadoAviso.INACTIVO }, actor);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ estado: EstadoAviso.INACTIVO }),
      );
    });
  });

  describe('consultar (GET): visibilidad según permiso', () => {
    const filtros = (extra: object = {}) =>
      ({ pagina: 1, limite: 10, ...extra }) as never;

    it('por defecto solo avisos ACTIVOS', async () => {
      await servicio.consultar(filtros(), true);
      expect(repo.qb.where).toHaveBeenCalledWith('aviso.estado = :estado', {
        estado: 'ACTIVO',
      });
    });

    it('lectura (sin permiso completo) que pide INACTIVO no recibe nada', async () => {
      await servicio.consultar(
        filtros({ estado: EstadoAviso.INACTIVO }),
        false,
      );
      expect(repo.qb.where).toHaveBeenCalledWith('1 = 0');
    });

    it('lectura que pide TODOS solo recibe activos', async () => {
      await servicio.consultar(filtros({ estado: 'TODOS' }), false);
      expect(repo.qb.where).toHaveBeenCalledWith('aviso.estado = :estado', {
        estado: 'ACTIVO',
      });
    });

    it('administrador con TODOS: sin filtro de estado', async () => {
      await servicio.consultar(filtros({ estado: 'TODOS' }), true);
      expect(repo.qb.where).not.toHaveBeenCalled();
    });

    it('administrador con INACTIVO: solo inactivos', async () => {
      await servicio.consultar(filtros({ estado: EstadoAviso.INACTIVO }), true);
      expect(repo.qb.where).toHaveBeenCalledWith('aviso.estado = :estado', {
        estado: 'INACTIVO',
      });
    });

    it('busca por título y ordena por fecha e id descendente', async () => {
      repo.qb.getManyAndCount.mockResolvedValue([[aviso()], 1]);
      const r = await servicio.consultar(filtros({ q: 'fer' }), false);
      expect(repo.qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        { q: '%fer%' },
      );
      expect(repo.qb.orderBy).toHaveBeenCalledWith('aviso.fecha', 'DESC');
      expect(repo.qb.addOrderBy).toHaveBeenCalledWith('aviso.id', 'DESC');
      expect(r.datos[0]).toMatchObject({ id: 3, estado: 'ACTIVO' });
    });
  });

  describe('consultarPublicos (GET /publicos)', () => {
    it('solo activos y expone únicamente campos públicos', async () => {
      repo.qb.getManyAndCount.mockResolvedValue([
        [aviso({ flyerTipo: 'image/png' })],
        1,
      ]);

      const r = await servicio.consultarPublicos({
        pagina: 1,
        limite: 10,
      });

      expect(repo.qb.where).toHaveBeenCalledWith('aviso.estado = :estado', {
        estado: 'ACTIVO',
      });
      expect(r.datos[0]).toEqual({
        id: 3,
        titulo: 'Feria',
        descripcion: 'En el gimnasio',
        fecha: '2026-11-05',
        categoria: 'EVENTOS',
        tieneFlyer: true,
        creadoEn: '2026-10-01T00:00:00.000Z',
      });
      expect(r.datos[0]).not.toHaveProperty('creadoPor');
      expect(r.datos[0]).not.toHaveProperty('estado');
    });

    it('filtra por categoría', async () => {
      await servicio.consultarPublicos({
        categoria: CategoriaAviso.ACADEMICOS,
        pagina: 1,
        limite: 10,
      });
      expect(repo.qb.andWhere).toHaveBeenCalledWith(
        'aviso.categoria = :categoria',
        { categoria: 'ACADEMICOS' },
      );
    });

    it('avisos antiguos sin categoría se publican con categoria null', async () => {
      repo.qb.getManyAndCount.mockResolvedValue([
        [aviso({ categoria: undefined })],
        1,
      ]);
      const r = await servicio.consultarPublicos({
        pagina: 1,
        limite: 10,
      });
      expect(r.datos[0].categoria).toBeNull();
    });
  });

  describe('obtener (GET :id)', () => {
    it('devuelve el aviso', async () => {
      repo.findOneBy.mockResolvedValue(aviso());
      expect(await servicio.obtener(3)).toMatchObject({ id: 3 });
    });

    it('404 si no existe', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(servicio.obtener(3)).rejects.toThrow(
        new NotFoundException('El aviso institucional no existe.'),
      );
    });
  });

  describe('guardarFlyer (PUT :id/flyer)', () => {
    const archivo = (extra: object = {}) => ({
      buffer: Buffer.from('img'),
      mimetype: 'image/png',
      size: 3,
      ...extra,
    });

    it.each([
      undefined,
      { buffer: Buffer.alloc(0), mimetype: 'image/png', size: 0 },
    ])('400 sin archivo o archivo vacío (%p)', async (a) => {
      await expect(servicio.guardarFlyer(3, a as never, actor)).rejects.toThrow(
        'Seleccione una imagen para el flyer.',
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it.each([
      ['image/png', 'image/png'],
      ['image/jpeg', 'image/jpeg'],
      ['image/webp', 'image/webp'],
      ['image/jpg', 'image/jpeg'],
    ])('acepta %s (se guarda como %s)', async (entrada, guardado) => {
      repo.findOneBy.mockResolvedValue(aviso());
      await servicio.guardarFlyer(3, archivo({ mimetype: entrada }), actor);
      expect(repo.update).toHaveBeenCalledWith(
        3,
        expect.objectContaining({ flyerTipo: guardado, actualizadoPor: 'u-1' }),
      );
    });

    it.each(['application/pdf', 'image/gif', 'text/html', 'image/svg+xml'])(
      '400 para tipo %s',
      async (mimetype) => {
        await expect(
          servicio.guardarFlyer(3, archivo({ mimetype }), actor),
        ).rejects.toThrow('JPG, PNG o WebP');
      },
    );

    it('400 si supera 5 MB (aunque el límite de multer ya lo corte antes)', async () => {
      await expect(
        servicio.guardarFlyer(3, archivo({ size: 5 * 1024 * 1024 + 1 }), actor),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('acepta exactamente 5 MB', async () => {
      repo.findOneBy.mockResolvedValue(aviso());
      await expect(
        servicio.guardarFlyer(3, archivo({ size: 5 * 1024 * 1024 }), actor),
      ).resolves.toMatchObject({ tieneFlyer: true });
    });

    it('404 si el aviso no existe (y no escribe)', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(
        servicio.guardarFlyer(3, archivo(), actor),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('quitarFlyer (DELETE :id/flyer)', () => {
    it('borra imagen y tipo, y registra al responsable', async () => {
      repo.findOneBy.mockResolvedValue(aviso({ flyerTipo: 'image/png' }));
      const r = await servicio.quitarFlyer(3, actor);
      expect(repo.update).toHaveBeenCalledWith(
        3,
        expect.objectContaining({
          flyer: null,
          flyerTipo: null,
          actualizadoPor: 'u-1',
        }),
      );
      expect(r.tieneFlyer).toBe(false);
    });

    it('404 si el aviso no existe', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(servicio.quitarFlyer(3, actor)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('obtenerFlyer (GET :id/flyer[/gestion])', () => {
    it('404 si el aviso no tiene imagen', async () => {
      repo.qb.getOne.mockResolvedValue(aviso({ flyer: null }));
      await expect(servicio.obtenerFlyer(3)).rejects.toThrow(
        'Este aviso no tiene flyer.',
      );
    });

    it('404 si el aviso no existe (o está inactivo en la consulta pública)', async () => {
      repo.qb.getOne.mockResolvedValue(null);
      await expect(servicio.obtenerFlyer(3)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.qb.andWhere).toHaveBeenCalledWith('aviso.estado = :estado', {
        estado: 'ACTIVO',
      });
    });

    it('con incluirInactivos no filtra por estado', async () => {
      repo.qb.getOne.mockResolvedValue(
        aviso({ flyer: Buffer.from('x'), flyerTipo: 'image/png' }),
      );
      const r = await servicio.obtenerFlyer(3, { incluirInactivos: true });
      expect(repo.qb.andWhere).not.toHaveBeenCalled();
      expect(r).toEqual({ contenido: Buffer.from('x'), tipo: 'image/png' });
    });
  });
});
