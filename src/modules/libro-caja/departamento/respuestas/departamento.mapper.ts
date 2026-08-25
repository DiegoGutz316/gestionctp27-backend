import type { DepartamentoCaja } from '../entities/departamento-caja.entity';

export interface DepartamentoCajaRespuesta {
  id: number;
  nombreUnidad: string;
  tipoActividad: string;
  activo: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}

export function mapearDepartamento(
  departamento: DepartamentoCaja,
): DepartamentoCajaRespuesta {
  return {
    id: departamento.id,
    nombreUnidad: departamento.nombreUnidad,
    tipoActividad: departamento.tipoActividad,
    activo: departamento.activo,
    creadoEn: departamento.creadoEn,
    actualizadoEn: departamento.actualizadoEn,
  };
}
