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
  finalizadaEn: string | null;
  motivoFinalizacion: string | null;
  motivoDetalle: string | null;
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
    finalizadaEn: siembra.finalizadaEn ?? null,
    motivoFinalizacion: siembra.motivoFinalizacion ?? null,
    motivoDetalle: siembra.motivoDetalle ?? null,
    creadoEn: siembra.creadoEn,
    creadoPor: siembra.creadoPor,
  };
}
