import type { AsientoCaja } from '../entities/asiento-caja.entity';
import type { FondoCaja } from '../entities/fondo-caja.entity';
import {
  mapearFondo,
  mapearPeriodoResumen,
  type FondoCajaRespuesta,
  type PeriodoCajaResumenRespuesta,
} from './periodo.mapper';

export interface AsientoCajaRespuesta {
  id: number;
  numero: number;
  fecha: string;
  numeroFactura: string;
  descripcion: string;
  ingresos: number;
  egresos: number;
  saldo: number;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface TotalesAsientosRespuesta {
  ingresos: number;
  egresos: number;
  saldo: number;
}

export interface LibroDepartamentoRespuesta {
  periodo: PeriodoCajaResumenRespuesta;
  fondo: FondoCajaRespuesta;
  fondoInicial: number;
  asientos: AsientoCajaRespuesta[];
  totales: TotalesAsientosRespuesta;
}

function redondearColones(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function mapearLibroDepartamento(
  fondo: FondoCaja,
  asientos: AsientoCaja[],
): LibroDepartamentoRespuesta {
  const fondoInicial = redondearColones(fondo.montoSolicitado ?? 0);
  let saldo = fondoInicial;
  let totalIngresos = 0;
  let totalEgresos = 0;

  const filas = asientos.map((asiento) => {
    totalIngresos = redondearColones(totalIngresos + asiento.ingresos);
    totalEgresos = redondearColones(totalEgresos + asiento.egresos);
    saldo = redondearColones(saldo + asiento.ingresos - asiento.egresos);
    return {
      id: asiento.id,
      numero: asiento.numero,
      fecha: asiento.fecha,
      numeroFactura: asiento.numeroFactura,
      descripcion: asiento.descripcion,
      ingresos: asiento.ingresos,
      egresos: asiento.egresos,
      saldo,
      creadoEn: asiento.creadoEn,
      actualizadoEn: asiento.actualizadoEn,
    };
  });

  return {
    periodo: mapearPeriodoResumen(fondo.periodo),
    fondo: mapearFondo(fondo),
    fondoInicial,
    asientos: filas,
    totales: {
      ingresos: totalIngresos,
      egresos: totalEgresos,
      saldo,
    },
  };
}
