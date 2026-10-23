/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - AvisoController (permiso REPORTES)
 *
 *   GET    /comunicacion/avisos                LECTURA (puedeAdministrar según rol)
 *   GET    /comunicacion/avisos/publicos       público
 *   POST   /comunicacion/avisos                COMPLETO
 *   PATCH  /comunicacion/avisos/:id/desactivar COMPLETO
 *   GET    /comunicacion/avisos/:id/flyer/gestion LECTURA
 *   GET    /comunicacion/avisos/:id/flyer      público
 *   PUT    /comunicacion/avisos/:id/flyer      COMPLETO (multipart, máx. 5 MB)
 *   DELETE /comunicacion/avisos/:id/flyer      COMPLETO
 *   GET    /comunicacion/avisos/:id            COMPLETO
 *   PATCH  /comunicacion/avisos/:id            COMPLETO
 */
import { INestApplication } from '@nestjs/common';
import {
  crearAppDePrueba,
  llamar,
  rolesCon,
  rolesSin,
  servicioSimulado,
  usuarioDePrueba,
} from '../../../test/helpers/endpoint-app';
import { ModuloSistema } from '../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../auth/enums/nivel-permiso.enum';
import { RolUsuario } from '../usuarios/enums/rol-usuario.enum';
import { AvisoController } from './aviso.controller';
import { AvisoService } from './aviso.service';
import { CategoriaAviso } from './enums/categoria-aviso.enum';
import { EstadoAviso } from './enums/estado-aviso.enum';

const admin = usuarioDePrueba(RolUsuario.ADMINISTRADOR);
const CON_COMPLETO = rolesCon(ModuloSistema.REPORTES, NivelPermiso.COMPLETO);
const SIN_COMPLETO = rolesSin(ModuloSistema.REPORTES, NivelPermiso.COMPLETO);
const SIN_LECTURA = rolesSin(ModuloSistema.REPORTES, NivelPermiso.LECTURA);

describe('AvisoController (endpoints)', () => {
  let app: INestApplication;
  const servicio = servicioSimulado(
    'consultar',
    'consultarPublicos',
    'registrar',
    'desactivar',
    'obtenerFlyer',
    'guardarFlyer',
    'quitarFlyer',
    'obtener',
    'actualizar',
  );

  beforeAll(async () => {
    app = await crearAppDePrueba({
      controllers: [AvisoController],
      providers: [{ provide: AvisoService, useValue: servicio }],
    });
  });
  afterAll(() => app.close());
  beforeEach(() => jest.resetAllMocks());

  const aviso = {
    titulo: 'Feria anual',
    descripcion: 'En el gimnasio',
    categoria: CategoriaAviso.EVENTOS,
    fecha: '2026-11-05',
  };

  describe('GET /comunicacion/avisos', () => {
    it.each(CON_COMPLETO)('200: %s puede administrar (true)', async (rol) => {
      servicio.consultar.mockResolvedValue({ datos: [] });
      const res = await llamar(
        app,
        'get',
        '/comunicacion/avisos?estado=TODOS',
        rol,
      );
      expect(res.status).toBe(200);
      expect(servicio.consultar).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'TODOS' }),
        true,
      );
    });

    it('200: la directora (solo LECTURA) consulta con puedeAdministrar=false', async () => {
      servicio.consultar.mockResolvedValue({ datos: [] });
      const res = await llamar(
        app,
        'get',
        '/comunicacion/avisos',
        RolUsuario.DIRECTORA,
      );
      expect(res.status).toBe(200);
      expect(servicio.consultar).toHaveBeenCalledWith(expect.anything(), false);
    });

    it.each(['?estado=BORRADOR', '?categoria=X', '?pagina=0', '?q='])(
      '400: query inválida %s',
      async (q) => {
        expect(
          (await llamar(app, 'get', `/comunicacion/avisos${q}`, admin.rol))
            .status,
        ).toBe(400);
      },
    );

    it('401 sin sesión', async () => {
      expect((await llamar(app, 'get', '/comunicacion/avisos')).status).toBe(
        401,
      );
    });

    it.each(SIN_LECTURA)('403 para %s', async (rol) => {
      expect(
        (await llamar(app, 'get', '/comunicacion/avisos', rol)).status,
      ).toBe(403);
    });
  });

  describe('GET /comunicacion/avisos/publicos', () => {
    it('200 sin sesión', async () => {
      servicio.consultarPublicos.mockResolvedValue({
        datos: [{ titulo: 'x' }],
      });
      const res = await llamar(
        app,
        'get',
        '/comunicacion/avisos/publicos?categoria=EVENTOS',
      );
      expect(res.status).toBe(200);
      expect(servicio.consultarPublicos).toHaveBeenCalledWith(
        expect.objectContaining({ categoria: CategoriaAviso.EVENTOS }),
      );
    });

    it('400: categoría inválida', async () => {
      expect(
        (await llamar(app, 'get', '/comunicacion/avisos/publicos?categoria=Z'))
          .status,
      ).toBe(400);
    });
  });

  describe('POST /comunicacion/avisos', () => {
    it('201: publica y pasa el actor', async () => {
      servicio.registrar.mockResolvedValue({ id: 1, ...aviso });
      const res = await llamar(
        app,
        'post',
        '/comunicacion/avisos',
        admin.rol,
      ).send(aviso);
      expect(res.status).toBe(201);
      expect(servicio.registrar).toHaveBeenCalledWith(
        expect.objectContaining(aviso),
        admin,
      );
    });

    it('recorta espacios del título', async () => {
      servicio.registrar.mockResolvedValue({});
      await llamar(app, 'post', '/comunicacion/avisos', admin.rol).send({
        ...aviso,
        titulo: '  Feria  ',
        estado: EstadoAviso.INACTIVO,
      });
      expect(servicio.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          titulo: 'Feria',
          estado: EstadoAviso.INACTIVO,
        }),
        admin,
      );
    });

    it.each([
      ['sin título', { ...aviso, titulo: '' }],
      ['título > 150', { ...aviso, titulo: 'x'.repeat(151) }],
      ['descripción > 2000', { ...aviso, descripcion: 'x'.repeat(2001) }],
      ['categoría inválida', { ...aviso, categoria: 'OTRA' }],
      ['fecha inexistente', { ...aviso, fecha: '2026-02-30' }],
      ['fecha con formato erróneo', { ...aviso, fecha: '05/11/2026' }],
      ['estado inválido', { ...aviso, estado: 'BORRADOR' }],
      ['campo extra', { ...aviso, autor: 'x' }],
    ])('400: %s', async (_c, cuerpo) => {
      const res = await llamar(
        app,
        'post',
        '/comunicacion/avisos',
        admin.rol,
      ).send(cuerpo);
      expect(res.status).toBe(400);
      expect(servicio.registrar).not.toHaveBeenCalled();
    });

    it.each(SIN_COMPLETO)('403 para %s', async (rol) => {
      expect(
        (await llamar(app, 'post', '/comunicacion/avisos', rol).send(aviso))
          .status,
      ).toBe(403);
    });

    it('401 sin sesión', async () => {
      expect(
        (await llamar(app, 'post', '/comunicacion/avisos').send(aviso)).status,
      ).toBe(401);
    });
  });

  describe('PATCH /comunicacion/avisos/:id/desactivar', () => {
    it('200: delega con id numérico y actor', async () => {
      servicio.desactivar.mockResolvedValue({
        id: 3,
        estado: EstadoAviso.INACTIVO,
      });
      const res = await llamar(
        app,
        'patch',
        '/comunicacion/avisos/3/desactivar',
        admin.rol,
      );
      expect(res.status).toBe(200);
      expect(servicio.desactivar).toHaveBeenCalledWith(3, admin);
    });

    it('no se confunde con PATCH :id', async () => {
      servicio.desactivar.mockResolvedValue({});
      await llamar(
        app,
        'patch',
        '/comunicacion/avisos/3/desactivar',
        admin.rol,
      );
      expect(servicio.actualizar).not.toHaveBeenCalled();
    });

    it('400: id no numérico', async () => {
      expect(
        (
          await llamar(
            app,
            'patch',
            '/comunicacion/avisos/abc/desactivar',
            admin.rol,
          )
        ).status,
      ).toBe(400);
    });

    it.each(SIN_COMPLETO)('403 para %s', async (rol) => {
      expect(
        (await llamar(app, 'patch', '/comunicacion/avisos/3/desactivar', rol))
          .status,
      ).toBe(403);
    });
  });

  describe('GET flyer (gestión y público)', () => {
    const archivo = { contenido: Buffer.from('PNG'), tipo: 'image/png' };

    it('gestión 200: incluye inactivos y devuelve la imagen inline', async () => {
      servicio.obtenerFlyer.mockResolvedValue(archivo);
      const res = await llamar(
        app,
        'get',
        '/comunicacion/avisos/7/flyer/gestion',
        RolUsuario.DIRECTORA,
      );
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('image/png');
      expect(res.headers['content-disposition']).toContain('inline');
      expect(servicio.obtenerFlyer).toHaveBeenCalledWith(7, {
        incluirInactivos: true,
      });
    });

    it('gestión 401 sin sesión', async () => {
      expect(
        (await llamar(app, 'get', '/comunicacion/avisos/7/flyer/gestion'))
          .status,
      ).toBe(401);
    });

    it.each(SIN_LECTURA)('gestión 403 para %s', async (rol) => {
      expect(
        (await llamar(app, 'get', '/comunicacion/avisos/7/flyer/gestion', rol))
          .status,
      ).toBe(403);
    });

    it('público 200 sin sesión: solo avisos activos', async () => {
      servicio.obtenerFlyer.mockResolvedValue(archivo);
      const res = await llamar(app, 'get', '/comunicacion/avisos/7/flyer');
      expect(res.status).toBe(200);
      expect(servicio.obtenerFlyer).toHaveBeenCalledWith(7);
    });

    it('público 404 propagado cuando el aviso no tiene imagen', async () => {
      const { NotFoundException } = jest.requireActual('@nestjs/common');
      servicio.obtenerFlyer.mockRejectedValue(new NotFoundException());
      expect(
        (await llamar(app, 'get', '/comunicacion/avisos/7/flyer')).status,
      ).toBe(404);
    });

    it('400: id no numérico', async () => {
      expect(
        (await llamar(app, 'get', '/comunicacion/avisos/x/flyer')).status,
      ).toBe(400);
    });
  });

  describe('PUT /comunicacion/avisos/:id/flyer', () => {
    it('200: recibe el archivo multipart y lo pasa al servicio', async () => {
      servicio.guardarFlyer.mockResolvedValue({ id: 4 });
      const res = await llamar(
        app,
        'put',
        '/comunicacion/avisos/4/flyer',
        admin.rol,
      ).attach('flyer', Buffer.from('imagen'), {
        filename: 'f.png',
        contentType: 'image/png',
      });
      expect(res.status).toBe(200);
      const [id, archivo, actor] = servicio.guardarFlyer.mock.calls[0] as [
        number,
        { originalname: string; mimetype: string },
        unknown,
      ];
      expect(id).toBe(4);
      expect(archivo).toMatchObject({
        originalname: 'f.png',
        mimetype: 'image/png',
      });
      expect(actor).toEqual(admin);
    });

    it('sin archivo: delega con undefined para que el servicio responda el error', async () => {
      servicio.guardarFlyer.mockResolvedValue({});
      await llamar(app, 'put', '/comunicacion/avisos/4/flyer', admin.rol);
      expect(servicio.guardarFlyer).toHaveBeenCalledWith(4, undefined, admin);
    });

    it('413: archivo mayor a 5 MB (HALLAZGO H-01: ErrorDeFlyerFilter no se aplica, ver reporte)', async () => {
      const res = await llamar(
        app,
        'put',
        '/comunicacion/avisos/4/flyer',
        admin.rol,
      ).attach('flyer', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'grande.png',
        contentType: 'image/png',
      });
      expect(res.status).toBe(413);
      // El mensaje en español del filtro nunca llega al cliente.
      expect(res.body.message).not.toBe('El flyer no puede superar 5 MB.');
      expect(servicio.guardarFlyer).not.toHaveBeenCalled();
    });

    it('400: campo de archivo con nombre incorrecto (mensaje de multer en inglés, H-01)', async () => {
      const res = await llamar(
        app,
        'put',
        '/comunicacion/avisos/4/flyer',
        admin.rol,
      ).attach('otro', Buffer.from('x'), {
        filename: 'f.png',
        contentType: 'image/png',
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Unexpected field - otro');
    });

    it.each(SIN_COMPLETO)('403 para %s', async (rol) => {
      expect(
        (await llamar(app, 'put', '/comunicacion/avisos/4/flyer', rol)).status,
      ).toBe(403);
    });
  });

  describe('DELETE /comunicacion/avisos/:id/flyer', () => {
    it('200: quita el flyer', async () => {
      servicio.quitarFlyer.mockResolvedValue({ id: 4 });
      const res = await llamar(
        app,
        'delete',
        '/comunicacion/avisos/4/flyer',
        admin.rol,
      );
      expect(res.status).toBe(200);
      expect(servicio.quitarFlyer).toHaveBeenCalledWith(4, admin);
    });

    it.each(SIN_COMPLETO)('403 para %s', async (rol) => {
      expect(
        (await llamar(app, 'delete', '/comunicacion/avisos/4/flyer', rol))
          .status,
      ).toBe(403);
    });

    it('401 sin sesión', async () => {
      expect(
        (await llamar(app, 'delete', '/comunicacion/avisos/4/flyer')).status,
      ).toBe(401);
    });
  });

  describe('GET /comunicacion/avisos/:id', () => {
    it('200: consulta un aviso', async () => {
      servicio.obtener.mockResolvedValue({ id: 9 });
      const res = await llamar(app, 'get', '/comunicacion/avisos/9', admin.rol);
      expect(res.status).toBe(200);
      expect(servicio.obtener).toHaveBeenCalledWith(9);
    });

    it('400: id no numérico', async () => {
      expect(
        (await llamar(app, 'get', '/comunicacion/avisos/nueve', admin.rol))
          .status,
      ).toBe(400);
    });

    it.each(SIN_COMPLETO)(
      '403 para %s (requiere permiso completo)',
      async (rol) => {
        expect(
          (await llamar(app, 'get', '/comunicacion/avisos/9', rol)).status,
        ).toBe(403);
      },
    );
  });

  describe('PATCH /comunicacion/avisos/:id', () => {
    const edicion = { ...aviso, estado: EstadoAviso.ACTIVO };

    it('200: edita con actor', async () => {
      servicio.actualizar.mockResolvedValue({ id: 9 });
      const res = await llamar(
        app,
        'patch',
        '/comunicacion/avisos/9',
        admin.rol,
      ).send(edicion);
      expect(res.status).toBe(200);
      expect(servicio.actualizar).toHaveBeenCalledWith(
        9,
        expect.objectContaining(edicion),
        admin,
      );
    });

    it.each([
      ['sin estado (obligatorio al editar)', aviso],
      ['categoría inválida', { ...edicion, categoria: 'N' }],
      ['fecha inválida', { ...edicion, fecha: '2026-13-01' }],
    ])('400: %s', async (_c, cuerpo) => {
      const res = await llamar(
        app,
        'patch',
        '/comunicacion/avisos/9',
        admin.rol,
      ).send(cuerpo);
      expect(res.status).toBe(400);
      expect(servicio.actualizar).not.toHaveBeenCalled();
    });

    it.each(SIN_COMPLETO)('403 para %s', async (rol) => {
      expect(
        (
          await llamar(app, 'patch', '/comunicacion/avisos/9', rol).send(
            edicion,
          )
        ).status,
      ).toBe(403);
    });
  });
});
