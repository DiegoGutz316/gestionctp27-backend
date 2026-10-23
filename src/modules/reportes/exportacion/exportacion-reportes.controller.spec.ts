/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call -- los matchers de Jest (expect.objectContaining, etc.) devuelven any */
/**
 * Pruebas de endpoints - ExportacionReportesController (módulo REPORTES, LECTURA)
 *
 *   GET /reportes/exportacion/produccion-pecuaria/{pdf,excel}
 *   GET /reportes/exportacion/produccion-agricola/{pdf,excel}
 *   GET /reportes/exportacion/inventario/{pdf,excel}
 *
 * Los servicios de reporte se simulan (sin BD); los generadores PDF y Excel
 * son los reales, así que se verifica que el cuerpo sea un archivo auténtico
 * (cabecera %PDF / contenedor ZIP de .xlsx) con sus cabeceras de descarga.
 */
import { INestApplication } from '@nestjs/common';
import {
  crearAppDePrueba,
  llamar,
  rolesCon,
  rolesSin,
  servicioSimulado,
} from '../../../../test/helpers/endpoint-app';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';
import { ReporteInventarioService } from '../inventario/reporte-inventario.service';
import { ReporteProduccionAgricolaService } from '../produccion-agricola/reporte-produccion-agricola.service';
import { ReporteProduccionPecuariaService } from '../produccion-pecuaria/reporte-produccion-pecuaria.service';
import { ExportacionReportesController } from './exportacion-reportes.controller';
import { ReporteExcelService } from './reporte-excel.service';
import { ReportePdfService } from './reporte-pdf.service';

const BASE = '/reportes/exportacion';
const RANGO = 'fechaInicio=2026-09-01&fechaFin=2026-09-30';
const XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const reportes = {
  pecuaria: {
    animal: {
      id: 1,
      codigo: 'V-01',
      nombre: 'Luna',
      especie: 'VACA',
      estado: 'ACTIVO',
    },
    fechaInicio: '2026-09-01',
    fechaFin: '2026-09-30',
    registros: [
      { id: 1, tipoProduccion: 'LECHE', cantidad: 12.5, fecha: '2026-09-02' },
    ],
    totales: [{ tipoProduccion: 'LECHE', cantidad: 12.5 }],
  },
  agricola: {
    siembras: [],
    cosechas: [],
    tratamientos: [],
    totales: { cosechas: [] },
  },
  inventario: {
    fechaInicio: '2026-09-01',
    fechaFin: '2026-09-30',
    registros: [
      {
        inventarioId: 1,
        productoId: 1,
        producto: 'Concentrado',
        categoria: 'INSUMO',
        unidadMedida: 'UNIDAD',
        entradas: 10,
        salidas: 2,
        existenciaFinal: 8,
        saldoActual: 8,
      },
    ],
  },
};

interface CasoExportacion {
  nombre: string;
  ruta: string;
  extension: 'pdf' | 'xlsx';
  archivo: string;
  servicio: 'pecuaria' | 'agricola' | 'inventario';
  invalida: string;
}

const casos: CasoExportacion[] = [
  {
    nombre: 'pecuaria PDF',
    ruta: `${BASE}/produccion-pecuaria/pdf?animalId=1&${RANGO}`,
    extension: 'pdf',
    archivo: 'reporte-produccion-pecuaria-2026-09-01-2026-09-30.pdf',
    servicio: 'pecuaria',
    invalida: `${BASE}/produccion-pecuaria/pdf?${RANGO}`,
  },
  {
    nombre: 'pecuaria Excel',
    ruta: `${BASE}/produccion-pecuaria/excel?animalId=1&${RANGO}`,
    extension: 'xlsx',
    archivo: 'reporte-produccion-pecuaria-2026-09-01-2026-09-30.xlsx',
    servicio: 'pecuaria',
    invalida: `${BASE}/produccion-pecuaria/excel?${RANGO}`,
  },
  {
    nombre: 'agrícola PDF',
    ruta: `${BASE}/produccion-agricola/pdf?${RANGO}`,
    extension: 'pdf',
    archivo: 'reporte-produccion-agricola-2026-09-01-2026-09-30.pdf',
    servicio: 'agricola',
    invalida: `${BASE}/produccion-agricola/pdf`,
  },
  {
    nombre: 'agrícola Excel',
    ruta: `${BASE}/produccion-agricola/excel?${RANGO}`,
    extension: 'xlsx',
    archivo: 'reporte-produccion-agricola-2026-09-01-2026-09-30.xlsx',
    servicio: 'agricola',
    invalida: `${BASE}/produccion-agricola/excel`,
  },
  {
    nombre: 'inventario PDF',
    ruta: `${BASE}/inventario/pdf?${RANGO}`,
    extension: 'pdf',
    archivo: 'reporte-inventario-2026-09-01-2026-09-30.pdf',
    servicio: 'inventario',
    invalida: `${BASE}/inventario/pdf`,
  },
  {
    nombre: 'inventario Excel',
    ruta: `${BASE}/inventario/excel?${RANGO}`,
    extension: 'xlsx',
    archivo: 'reporte-inventario-2026-09-01-2026-09-30.xlsx',
    servicio: 'inventario',
    invalida: `${BASE}/inventario/excel`,
  },
];

const CON_ACCESO = rolesCon(ModuloSistema.REPORTES, NivelPermiso.LECTURA);
const SIN_ACCESO = rolesSin(ModuloSistema.REPORTES, NivelPermiso.LECTURA);

function binario(res: { body: unknown }): Buffer {
  return res.body as Buffer;
}

describe('ExportacionReportesController (endpoints)', () => {
  let app: INestApplication;
  const pecuaria = servicioSimulado('generar');
  const agricola = servicioSimulado('generar');
  const inventario = servicioSimulado('generar');
  const mocks = { pecuaria, agricola, inventario };

  beforeAll(async () => {
    app = await crearAppDePrueba({
      controllers: [ExportacionReportesController],
      providers: [
        { provide: ReporteProduccionPecuariaService, useValue: pecuaria },
        { provide: ReporteProduccionAgricolaService, useValue: agricola },
        { provide: ReporteInventarioService, useValue: inventario },
        ReportePdfService,
        ReporteExcelService,
      ],
    });
  });
  afterAll(() => app.close());
  beforeEach(() => {
    jest.resetAllMocks();
    pecuaria.generar.mockResolvedValue(reportes.pecuaria);
    agricola.generar.mockResolvedValue(reportes.agricola);
    inventario.generar.mockResolvedValue(reportes.inventario);
  });

  describe.each(casos)('GET $ruta', (caso) => {
    it.each(CON_ACCESO)(
      `200: %s descarga un ${caso.extension} válido con nombre ${caso.archivo}`,
      async (rol) => {
        const res = await llamar(app, 'get', caso.ruta, rol)
          .buffer(true)
          .parse((r, cb) => {
            const trozos: Buffer[] = [];
            r.on('data', (t: Buffer) => trozos.push(t));
            r.on('end', () => cb(null, Buffer.concat(trozos)));
          });

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain(
          caso.extension === 'pdf' ? 'application/pdf' : XLSX,
        );
        expect(res.headers['content-disposition']).toBe(
          `attachment; filename="${caso.archivo}"`,
        );
        const cuerpo = binario(res);
        expect(Number(res.headers['content-length'])).toBe(cuerpo.length);
        expect(cuerpo.subarray(0, 4).toString('latin1')).toBe(
          caso.extension === 'pdf' ? '%PDF' : 'PK\u0003\u0004',
        );
        expect(mocks[caso.servicio].generar).toHaveBeenCalledTimes(1);
      },
    );

    it('401: sin sesión', async () => {
      expect((await llamar(app, 'get', caso.ruta)).status).toBe(401);
      expect(mocks[caso.servicio].generar).not.toHaveBeenCalled();
    });

    it.each(SIN_ACCESO)('403: %s no tiene acceso a REPORTES', async (rol) => {
      expect((await llamar(app, 'get', caso.ruta, rol)).status).toBe(403);
      expect(mocks[caso.servicio].generar).not.toHaveBeenCalled();
    });

    it('400: parámetros inválidos no generan archivo', async () => {
      const res = await llamar(
        app,
        'get',
        caso.invalida,
        RolUsuario.ADMINISTRADOR,
      );
      expect(res.status).toBe(400);
      expect(mocks[caso.servicio].generar).not.toHaveBeenCalled();
    });

    it('propaga el error del servicio de reportes (404 animal inexistente)', async () => {
      const { NotFoundException } = jest.requireActual('@nestjs/common');
      mocks[caso.servicio].generar.mockRejectedValue(new NotFoundException());
      const res = await llamar(app, 'get', caso.ruta, RolUsuario.ADMINISTRADOR);
      expect(res.status).toBe(404);
    });
  });

  it('rango invertido o futuro se rechaza con 400', async () => {
    for (const q of [
      'animalId=1&fechaInicio=2026-09-30&fechaFin=2026-09-01',
      'animalId=1&fechaInicio=2026-09-01&fechaFin=2999-01-01',
    ]) {
      const res = await llamar(
        app,
        'get',
        `${BASE}/produccion-pecuaria/pdf?${q}`,
        RolUsuario.ADMINISTRADOR,
      );
      expect(res.status).toBe(400);
    }
  });
});
