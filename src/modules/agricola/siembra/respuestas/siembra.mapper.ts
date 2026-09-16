import type { Siembra } from '../entities/siembra.entity';

export interface SiembraRespuesta {
  id: number;
  cama: {
    id: number;
    codigo: string;
    ubicacion: string;
  };
  tipoCultivo: string;
  fechaSiembra: string;
  cantidadSembrada: number;
  creadoEn: Date;
  creadoPor: string;
}

export function mapearSiembra(siembra: Siembra): SiembraRespuesta {
  return {
    id: siembra.id,
    cama: {
      id: siembra.cama.id,
      codigo: siembra.cama.codigo,
      ubicacion: siembra.cama.ubicacion,
    },
    tipoCultivo: siembra.tipoCultivo,
    fechaSiembra: siembra.fechaSiembra,
    cantidadSembrada: siembra.cantidadSembrada,
    creadoEn: siembra.creadoEn,
    creadoPor: siembra.creadoPor,
  };
}
