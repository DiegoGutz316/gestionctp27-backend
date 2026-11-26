/**
 * Endpoints QA usabilidad: solo ADMINISTRADOR + flag QA_USABILIDAD_ENABLED.
 */
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  crearAppDePrueba,
  llamar,
  servicioSimulado,
} from '../../../test/helpers/endpoint-app';
import { RolUsuario } from '../usuarios/enums/rol-usuario.enum';
import { QaUsabilidadHabilitadoGuard } from './guards/qa-usabilidad-habilitado.guard';
import { QaUsabilidadController } from './qa-usabilidad.controller';
import { QaUsabilidadService } from './qa-usabilidad.service';

describe('QaUsabilidadController (endpoints)', () => {
  let app: INestApplication;
  const servicio = servicioSimulado(
    'catalogo',
    'resumen',
    'listarParticipantes',
    'crearParticipante',
    'listarSesiones',
    'obtenerSesion',
    'crearSesion',
    'actualizarSesion',
    'finalizarSesion',
    'adjuntarEvidencia',
    'descargarEvidencia',
    'generarInformeMarkdown',
  );

  const config = { get: jest.fn() };

  beforeAll(async () => {
    config.get.mockImplementation((clave: string) =>
      clave === 'QA_USABILIDAD_ENABLED' ? 'true' : undefined,
    );
    app = await crearAppDePrueba({
      controllers: [QaUsabilidadController],
      providers: [
        { provide: QaUsabilidadService, useValue: servicio },
        { provide: ConfigService, useValue: config },
        QaUsabilidadHabilitadoGuard,
      ],
    });
  });
  afterAll(() => app.close());
  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((clave: string) =>
      clave === 'QA_USABILIDAD_ENABLED' ? 'true' : undefined,
    );
  });

  it('401 sin sesión', async () => {
    await llamar(app, 'get', '/qa/usabilidad/resumen').expect(401);
  });

  it.each([
    RolUsuario.DIRECTORA,
    RolUsuario.DOCENTE_PECUARIO,
    RolUsuario.DOCENTE_AGRICOLA,
    RolUsuario.ESTUDIANTE,
  ])('403: %s no administra evaluaciones QA', async (rol) => {
    await llamar(app, 'get', '/qa/usabilidad/resumen', rol).expect(403);
  });

  it('200: ADMINISTRADOR ve el resumen', async () => {
    servicio.resumen.mockResolvedValue({
      pruebasDefinidas: 10,
      sesionesReales: 0,
      pilotoTecnico: { origen: 'PILOTO_TECNICO' },
    });
    const res = await llamar(
      app,
      'get',
      '/qa/usabilidad/resumen',
      RolUsuario.ADMINISTRADOR,
    ).expect(200);
    expect(res.body.sesionesReales).toBe(0);
    expect(res.body.pilotoTecnico.origen).toBe('PILOTO_TECNICO');
  });

  it('404 si el flag QA está apagado', async () => {
    config.get.mockReturnValue('false');
    await llamar(
      app,
      'get',
      '/qa/usabilidad/catalogo',
      RolUsuario.ADMINISTRADOR,
    ).expect(404);
  });

  it('POST participante + sesión (admin)', async () => {
    servicio.crearParticipante.mockResolvedValue({ id: 1, codigo: 'DOC-01' });
    servicio.crearSesion.mockResolvedValue({
      id: 1,
      pruebaCodigo: 'USAB-01',
      estado: 'BORRADOR',
      origen: 'SESION_REAL',
    });

    await llamar(
      app,
      'post',
      '/qa/usabilidad/participantes',
      RolUsuario.ADMINISTRADOR,
    )
      .send({ codigo: 'DOC-01', rolPerfil: 'DOCENTE_PECUARIO' })
      .expect(201);

    await llamar(
      app,
      'post',
      '/qa/usabilidad/sesiones',
      RolUsuario.ADMINISTRADOR,
    )
      .send({
        participanteId: 1,
        pruebaCodigo: 'USAB-01',
        fechaEjecucion: '2026-11-10',
      })
      .expect(201);
  });

  it('GET informe.md (admin)', async () => {
    servicio.generarInformeMarkdown.mockResolvedValue(
      '# Informe\n\n> **Las pruebas con usuarios reales están pendientes.**\n',
    );
    const res = await llamar(
      app,
      'get',
      '/qa/usabilidad/informe.md',
      RolUsuario.ADMINISTRADOR,
    ).expect(200);
    expect(res.text).toContain('pendientes');
  });
});
