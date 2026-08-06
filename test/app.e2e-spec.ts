import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(() => {
    // La prueba no debe depender de secretos locales ni de una BD disponible.
    process.env.JWT_SECRET = 'secreto-exclusivo-para-pruebas-e2e';
    process.env.DATABASE_URL =
      'postgresql://e2e:e2e@127.0.0.1:1/gestionctp27_e2e';
    process.env.DB_SSL = 'false';
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/auth/login (POST) valida el DTO con class-validator', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: 'correo-invalido', contrasena: '' })
      .expect(400);
  });

  it('/usuarios (POST) exige autenticación', () => {
    return request(app.getHttpServer()).post('/usuarios').send({}).expect(401);
  });

  afterEach(async () => {
    await app?.close();
  });
});
