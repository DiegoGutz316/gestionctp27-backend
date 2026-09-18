import type { TratamientoAgricola } from '../entities/tratamiento-agricola.entity';

export interface TratamientoRespuesta {
  id: number;
  siembra: {
    id: number;
    tipoCultivo: string;
  };
  producto: string;
  fecha: string;
  cantidad: number;
  observaciones: string | null;
  creadoEn: Date;
  creadoPor: string;
}

export function mapearTratamiento(
  tratamiento: TratamientoAgricola,
): TratamientoRespuesta {
  return {
    id: tratamiento.id,
    siembra: {
      id: tratamiento.siembra.id,
      tipoCultivo: tratamiento.siembra.tipoCultivo,
    },
    producto: tratamiento.producto,
    fecha: tratamiento.fecha,
    cantidad: tratamiento.cantidad,
    observaciones: tratamiento.observaciones,
    creadoEn: tratamiento.creadoEn,
    creadoPor: tratamiento.creadoPor,
  };
}
