import type { Cosecha } from '../entities/cosecha.entity';

export interface CosechaRespuesta {
  id: number;
  siembra: {
    id: number;
    tipoCultivo: string;
    fechaSiembra: string;
  };
  fecha: string;
  cantidadObtenida: number;
  observaciones: string | null;
  creadoEn: Date;
  creadoPor: string;
}

export function mapearCosecha(cosecha: Cosecha): CosechaRespuesta {
  return {
    id: cosecha.id,
    siembra: {
      id: cosecha.siembra.id,
      tipoCultivo: cosecha.siembra.tipoCultivo,
      fechaSiembra: cosecha.siembra.fechaSiembra,
    },
    fecha: cosecha.fecha,
    cantidadObtenida: cosecha.cantidadObtenida,
    observaciones: cosecha.observaciones,
    creadoEn: cosecha.creadoEn,
    creadoPor: cosecha.creadoPor,
  };
}
