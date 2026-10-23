import type { DepartamentoCajaRespuesta } from '../../departamento/respuestas/departamento.mapper';
import { mapearDepartamento } from '../../departamento/respuestas/departamento.mapper';
import type { PieInformeCaja } from '../entities/fondo-caja.entity';
import type { FondoCaja } from '../entities/fondo-caja.entity';
import type { PeriodoCaja } from '../entities/periodo-caja.entity';
import type { EstadoFondo } from '../enums/estado-fondo.enum';
import type { EstadoPeriodo } from '../enums/estado-periodo.enum';

export interface FondoCajaRespuesta {
  id: number;
  montoSolicitado: number | null;
  estado: EstadoFondo;
  solicitadoEn: Date | null;
  departamento: DepartamentoCajaRespuesta;
  pieInforme: PieInformeCaja | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface PeriodoCajaResumenRespuesta {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  estado: EstadoPeriodo;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface PeriodoCajaRespuesta extends PeriodoCajaResumenRespuesta {
  fondos: FondoCajaRespuesta[];
}

export function mapearFondo(fondo: FondoCaja): FondoCajaRespuesta {
  return {
    id: fondo.id,
    montoSolicitado: fondo.montoSolicitado,
    estado: fondo.estado,
    solicitadoEn: fondo.solicitadoEn,
    departamento: mapearDepartamento(fondo.departamento),
    pieInforme: fondo.pieInforme ?? null,
    creadoEn: fondo.creadoEn,
    actualizadoEn: fondo.actualizadoEn,
  };
}

export function mapearPeriodoResumen(
  periodo: PeriodoCaja,
): PeriodoCajaResumenRespuesta {
  return {
    id: periodo.id,
    nombre: periodo.nombre,
    fechaInicio: periodo.fechaInicio,
    fechaFin: periodo.fechaFin,
    estado: periodo.estado,
    creadoEn: periodo.creadoEn,
    actualizadoEn: periodo.actualizadoEn,
  };
}

export function mapearPeriodo(periodo: PeriodoCaja): PeriodoCajaRespuesta {
  return {
    ...mapearPeriodoResumen(periodo),
    fondos: (periodo.fondos ?? []).map(mapearFondo),
  };
}
