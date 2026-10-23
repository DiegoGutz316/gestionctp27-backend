/**
 * Pruebas de endpoint - AppController: GET / (público, health check).
 */
import { INestApplication } from '@nestjs/common';
import { crearAppDePrueba, llamar } from '../test/helpers/endpoint-app';
import { RolUsuario } from './modules/usuarios/enums/rol-usuario.enum';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController (endpoint)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await crearAppDePrueba({
      controllers: [AppController],
      providers: [AppService],
    });
  });
  afterAll(() => app.close());

  it('GET / es público: 200 con el saludo, sin sesión', async () => {
    const res = await llamar(app, 'get', '/');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Hello World!');
  });

  it('GET / también responde con sesión', async () => {
    expect((await llamar(app, 'get', '/', RolUsuario.ESTUDIANTE)).status).toBe(
      200,
    );
  });

  it('rutas inexistentes: 404', async () => {
    expect(
      (await llamar(app, 'get', '/no-existe', RolUsuario.ADMINISTRADOR)).status,
    ).toBe(404);
  });
});
