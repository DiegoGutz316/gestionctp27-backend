import { BadRequestException, ConflictException } from '@nestjs/common';

import { PRUEBAS_USAB } from './catalogo/pruebas-usab';
import {
  EstadoSesionUsab,
  ResultadoUsab,
} from './enums/resultado-usab.enum';
import { QaUsabilidadService } from './qa-usabilidad.service';

function repoMock() {
  return {
    count: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((x: unknown) => x),
    save: jest.fn(async (x: unknown) => x),
  };
}

describe('QaUsabilidadService', () => {
  const participantes = repoMock();
  const sesiones = repoMock();
  const evidencias = repoMock();
  const historial = repoMock();
  const actor = {
    id: '11111111-1111-4111-8111-111111111111',
    correo: 'admin@ctp27.test',
    nombre: 'Admin',
    rol: 'ADMINISTRADOR' as const,
  };

  let servicio: QaUsabilidadService;

  beforeEach(() => {
    jest.resetAllMocks();
    servicio = new QaUsabilidadService(
      participantes as never,
      sesiones as never,
      evidencias as never,
      historial as never,
    );
  });

  it('catalogo expone 10 pruebas y el piloto técnico separado', () => {
    const cat = servicio.catalogo();
    expect(cat.totalDefinidas).toBe(10);
    expect(cat.porModulo).toEqual({
      LIBRO_CAJA: 3,
      PECUARIA: 3,
      AGRICOLA: 2,
      REPORTES_AVISOS: 2,
    });
    expect(cat.pruebas).toHaveLength(PRUEBAS_USAB.length);
    expect(cat.pilotoTecnico.origen).toBe('PILOTO_TECNICO');
  });

  it('resumen sin sesiones marca las 10 como pendientes', async () => {
    participantes.count.mockResolvedValue(0);
    sesiones.find.mockResolvedValue([]);
    evidencias.count.mockResolvedValue(0);
    const r = await servicio.resumen();
    expect(r.sesionesReales).toBe(0);
    expect(r.pruebasPendientesSinSesion).toHaveLength(10);
    expect(r.pilotoTecnico.origen).toBe('PILOTO_TECNICO');
  });

  it('no finaliza sin resultado', async () => {
    sesiones.findOne.mockResolvedValue({
      id: 1,
      estado: EstadoSesionUsab.BORRADOR,
      resultado: null,
    });
    await expect(servicio.finalizarSesion(1, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('exige motivo al editar sesión finalizada', async () => {
    sesiones.findOne.mockResolvedValue({
      id: 1,
      estado: EstadoSesionUsab.FINALIZADA,
      resultado: ResultadoUsab.COMPLETADA_SIN_AYUDA,
      errores: 0,
      ayudas: 0,
      horaInicio: null,
      horaFin: null,
      tiempoMinutos: null,
      observaciones: null,
      participante: { id: 1 },
    });
    await expect(
      servicio.actualizarSesion(1, { errores: 1 }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('registra historial al editar finalizada con motivo', async () => {
    const sesion = {
      id: 2,
      estado: EstadoSesionUsab.FINALIZADA,
      resultado: ResultadoUsab.COMPLETADA_CON_AYUDA,
      errores: 0,
      ayudas: 1,
      horaInicio: '09:00',
      horaFin: '09:20',
      tiempoMinutos: 20,
      observaciones: null,
      participante: { id: 1, codigo: 'DOC-01', rolPerfil: 'DOCENTE_PECUARIO' },
      evidencias: [],
      actualizadoPor: null,
    };
    sesiones.findOne
      .mockResolvedValueOnce(sesion)
      .mockResolvedValueOnce({ ...sesion, errores: 2, evidencias: [] });
    historial.find.mockResolvedValue([]);
    await servicio.actualizarSesion(
      2,
      { errores: 2, motivoCambio: 'Corrección de conteo' },
      actor,
    );
    expect(historial.save).toHaveBeenCalled();
    const histArg = historial.create.mock.calls[0][0] as {
      accion: string;
      detalle: { motivoCambio: string };
    };
    expect(histArg.accion).toBe('EDITAR_FINALIZADA');
    expect(histArg.detalle.motivoCambio).toBe('Corrección de conteo');
  });

  it('rechaza participante duplicado', async () => {
    participantes.findOne.mockResolvedValue({ id: 1, codigo: 'DOC-01' });
    await expect(
      servicio.crearParticipante(
        { codigo: 'doc-01', rolPerfil: 'DOCENTE_PECUARIO' },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('informe indica pendientes si no hay sesiones', async () => {
    participantes.count.mockResolvedValue(0);
    sesiones.find.mockResolvedValue([]);
    evidencias.count.mockResolvedValue(0);
    const md = await servicio.generarInformeMarkdown();
    expect(md).toContain('pendientes');
    expect(md.toLowerCase()).toContain('piloto técnico');
    expect(md).toContain('USAB-01');
  });
});
