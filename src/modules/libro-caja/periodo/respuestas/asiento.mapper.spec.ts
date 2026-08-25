import { EstadoFondo } from '../enums/estado-fondo.enum';
import { EstadoPeriodo } from '../enums/estado-periodo.enum';
import type { AsientoCaja } from '../entities/asiento-caja.entity';
import type { FondoCaja } from '../entities/fondo-caja.entity';
import { mapearLibroDepartamento } from './asiento.mapper';

describe('mapearLibroDepartamento', () => {
  const ahora = new Date('2026-03-12T12:00:00.000Z');
  const fondo = {
    id: 5,
    montoSolicitado: 100,
    estado: EstadoFondo.SOLICITADO,
    solicitadoEn: ahora,
    creadoEn: ahora,
    actualizadoEn: ahora,
    departamento: {
      id: 2,
      nombreUnidad: 'Unidad Pecuaria',
      tipoActividad: 'Producción pecuaria',
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
    periodo: {
      id: 1,
      nombre: 'II semestre 2026',
      fechaInicio: '2026-02-01',
      fechaFin: '2026-07-31',
      estado: EstadoPeriodo.ABIERTO,
      creadoEn: ahora,
      actualizadoEn: ahora,
    },
  } as FondoCaja;

  it('calcula el saldo corrido desde el fondo inicial', () => {
    const asientos = [
      asiento(1, 50, 0),
      asiento(2, 0, 20),
      asiento(3, 10, 0),
    ];

    const libro = mapearLibroDepartamento(fondo, asientos);

    expect(libro.fondoInicial).toBe(100);
    expect(libro.asientos.map((fila) => fila.saldo)).toEqual([150, 130, 140]);
    expect(libro.totales).toEqual({ ingresos: 60, egresos: 20, saldo: 140 });
  });

  it('si no hay asientos, el saldo es el fondo inicial', () => {
    const libro = mapearLibroDepartamento(fondo, []);
    expect(libro.totales).toEqual({ ingresos: 0, egresos: 0, saldo: 100 });
  });

  function asiento(
    numero: number,
    ingresos: number,
    egresos: number,
  ): AsientoCaja {
    return {
      id: numero,
      numero,
      fecha: '2026-03-12',
      numeroFactura: '',
      descripcion: `Asiento ${numero}`,
      ingresos,
      egresos,
      creadoEn: ahora,
      actualizadoEn: ahora,
      creadoPor: null,
    } as AsientoCaja;
  }
});
