/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - UsuariosController (módulo USUARIOS)
 *
 *   POST  /usuarios                 COMPLETO
 *   GET   /usuarios                 LECTURA
 *   GET   /usuarios/:id             LECTURA
 *   PATCH /usuarios/:id/desactivar  COMPLETO
 *   PATCH /usuarios/:id             COMPLETO
 *
 * Solo ADMINISTRADOR tiene permiso sobre USUARIOS en la matriz sembrada, así
 * que todo otro rol debe recibir 403 y una petición sin sesión 401.
 */
import { INestApplication } from '@nestjs/common';
import {
  crearAppDePrueba,
  llamar,
  servicioSimulado,
  usuarioDePrueba,
} from '../../../test/helpers/endpoint-app';
import { RolUsuario } from './enums/rol-usuario.enum';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

const ID = '8f14e45f-ceea-467a-9575-0b0a1a2b3c4d';
const admin = usuarioDePrueba(RolUsuario.ADMINISTRADOR);
const NO_ADMIN = Object.values(RolUsuario).filter(
  (r) => r !== RolUsuario.ADMINISTRADOR,
);

describe('UsuariosController (endpoints)', () => {
  let app: INestApplication;
  const servicio = servicioSimulado(
    'crear',
    'listar',
    'obtenerPorId',
    'desactivar',
    'actualizar',
  );

  beforeAll(async () => {
    app = await crearAppDePrueba({
      controllers: [UsuariosController],
      providers: [{ provide: UsuariosService, useValue: servicio }],
    });
  });
  afterAll(() => app.close());
  beforeEach(() => jest.resetAllMocks());

  const nuevo = {
    nombre: 'Ana Mora',
    correo: 'ana@ctp27.test',
    contrasena: 'Segura123',
    rol: RolUsuario.ESTUDIANTE,
  };
  const edicion = {
    nombre: 'Ana Mora',
    correo: 'ana@ctp27.test',
    rol: RolUsuario.DIRECTORA,
    activo: true,
  };

  describe('POST /usuarios', () => {
    it('201: crea el usuario y pasa el administrador autenticado al servicio', async () => {
      servicio.crear.mockResolvedValue({ id: ID, ...nuevo });

      const res = await llamar(app, 'post', '/usuarios', admin.rol).send(nuevo);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: ID, correo: nuevo.correo });
      expect(servicio.crear).toHaveBeenCalledWith(
        expect.objectContaining({ ...nuevo, activo: true }),
        admin,
      );
    });

    it.each([
      ['nombre de 1 caracter', { ...nuevo, nombre: 'A' }],
      ['correo inválido', { ...nuevo, correo: 'x' }],
      ['contraseña corta (<8)', { ...nuevo, contrasena: '1234567' }],
      ['contraseña larga (>72)', { ...nuevo, contrasena: 'x'.repeat(73) }],
      ['rol inexistente', { ...nuevo, rol: 'SUPERUSUARIO' }],
      ['activo no booleano', { ...nuevo, activo: 'si' }],
      ['propiedad no permitida', { ...nuevo, esAdmin: true }],
      ['cuerpo vacío', {}],
    ])('400: %s', async (_c, cuerpo) => {
      const res = await llamar(app, 'post', '/usuarios', admin.rol).send(
        cuerpo,
      );
      expect(res.status).toBe(400);
      expect(servicio.crear).not.toHaveBeenCalled();
    });

    it('401 sin sesión', async () => {
      expect((await llamar(app, 'post', '/usuarios').send(nuevo)).status).toBe(
        401,
      );
    });

    it.each(NO_ADMIN)('403 para %s', async (rol) => {
      const res = await llamar(app, 'post', '/usuarios', rol).send(nuevo);
      expect(res.status).toBe(403);
      expect(servicio.crear).not.toHaveBeenCalled();
    });
  });

  describe('GET /usuarios', () => {
    it('200: lista con filtros convertidos (pagina, limite, activo)', async () => {
      servicio.listar.mockResolvedValue({ datos: [], total: 0 });

      const res = await llamar(
        app,
        'get',
        '/usuarios?pagina=2&limite=5&activo=false&rol=DIRECTORA&order=DESC',
        admin.rol,
      );

      expect(res.status).toBe(200);
      expect(servicio.listar).toHaveBeenCalledWith(
        expect.objectContaining({
          pagina: 2,
          limite: 5,
          activo: false,
          rol: RolUsuario.DIRECTORA,
          order: 'DESC',
        }),
      );
    });

    it('200: aplica valores por defecto (pagina 1, limite 10, ASC)', async () => {
      servicio.listar.mockResolvedValue({});
      await llamar(app, 'get', '/usuarios', admin.rol);
      expect(servicio.listar).toHaveBeenCalledWith(
        expect.objectContaining({ pagina: 1, limite: 10, order: 'ASC' }),
      );
    });

    it.each([
      '?pagina=0',
      '?limite=101',
      '?pagina=abc',
      '?rol=OTRO',
      '?order=UP',
      '?activo=quizas',
    ])('400: query inválida %s', async (query) => {
      const res = await llamar(app, 'get', `/usuarios${query}`, admin.rol);
      expect(res.status).toBe(400);
      expect(servicio.listar).not.toHaveBeenCalled();
    });

    it('401 sin sesión', async () => {
      expect((await llamar(app, 'get', '/usuarios')).status).toBe(401);
    });

    it.each(NO_ADMIN)('403 para %s', async (rol) => {
      expect((await llamar(app, 'get', '/usuarios', rol)).status).toBe(403);
    });
  });

  describe('GET /usuarios/:id', () => {
    it('200: consulta por UUID', async () => {
      servicio.obtenerPorId.mockResolvedValue({ id: ID });
      const res = await llamar(app, 'get', `/usuarios/${ID}`, admin.rol);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: ID });
      expect(servicio.obtenerPorId).toHaveBeenCalledWith(ID);
    });

    it('400: id que no es UUID', async () => {
      const res = await llamar(app, 'get', '/usuarios/123', admin.rol);
      expect(res.status).toBe(400);
      expect(servicio.obtenerPorId).not.toHaveBeenCalled();
    });

    it('propaga 404 del servicio', async () => {
      const { NotFoundException } = jest.requireActual('@nestjs/common');
      servicio.obtenerPorId.mockRejectedValue(new NotFoundException());
      expect(
        (await llamar(app, 'get', `/usuarios/${ID}`, admin.rol)).status,
      ).toBe(404);
    });

    it('401 sin sesión / 403 sin permiso', async () => {
      expect((await llamar(app, 'get', `/usuarios/${ID}`)).status).toBe(401);
      expect(
        (await llamar(app, 'get', `/usuarios/${ID}`, RolUsuario.DIRECTORA))
          .status,
      ).toBe(403);
    });
  });

  describe('PATCH /usuarios/:id/desactivar', () => {
    it('200: desactiva y registra al actor', async () => {
      servicio.desactivar.mockResolvedValue({ id: ID, activo: false });
      const res = await llamar(
        app,
        'patch',
        `/usuarios/${ID}/desactivar`,
        admin.rol,
      );
      expect(res.status).toBe(200);
      expect(servicio.desactivar).toHaveBeenCalledWith(ID, admin);
    });

    it('400: id inválido', async () => {
      expect(
        (await llamar(app, 'patch', '/usuarios/xx/desactivar', admin.rol))
          .status,
      ).toBe(400);
    });

    it.each(NO_ADMIN)('403 para %s', async (rol) => {
      expect(
        (await llamar(app, 'patch', `/usuarios/${ID}/desactivar`, rol)).status,
      ).toBe(403);
    });

    it('401 sin sesión', async () => {
      expect(
        (await llamar(app, 'patch', `/usuarios/${ID}/desactivar`)).status,
      ).toBe(401);
    });
  });

  describe('PATCH /usuarios/:id', () => {
    it('200: edita (incluye rol) con el actor', async () => {
      servicio.actualizar.mockResolvedValue({ id: ID, ...edicion });
      const res = await llamar(app, 'patch', `/usuarios/${ID}`, admin.rol).send(
        edicion,
      );
      expect(res.status).toBe(200);
      expect(servicio.actualizar).toHaveBeenCalledWith(
        ID,
        expect.objectContaining(edicion),
        admin,
      );
    });

    it('la contraseña es opcional al editar', async () => {
      servicio.actualizar.mockResolvedValue({});
      const res = await llamar(app, 'patch', `/usuarios/${ID}`, admin.rol).send(
        {
          ...edicion,
          contrasena: 'NuevaClave1',
        },
      );
      expect(res.status).toBe(200);
    });

    it.each([
      [
        'sin activo',
        { nombre: 'Ana', correo: 'a@b.cr', rol: RolUsuario.ESTUDIANTE },
      ],
      ['rol inválido', { ...edicion, rol: 'X' }],
      ['contraseña corta', { ...edicion, contrasena: '123' }],
      ['campo extra', { ...edicion, creadoPor: 'x' }],
    ])('400: %s', async (_c, cuerpo) => {
      const res = await llamar(app, 'patch', `/usuarios/${ID}`, admin.rol).send(
        cuerpo,
      );
      expect(res.status).toBe(400);
      expect(servicio.actualizar).not.toHaveBeenCalled();
    });

    it('400: id inválido', async () => {
      expect(
        (await llamar(app, 'patch', '/usuarios/1', admin.rol).send(edicion))
          .status,
      ).toBe(400);
    });

    it.each(NO_ADMIN)('403 para %s', async (rol) => {
      expect(
        (await llamar(app, 'patch', `/usuarios/${ID}`, rol).send(edicion))
          .status,
      ).toBe(403);
    });
  });
});
