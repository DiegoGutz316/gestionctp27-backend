import type { TratamientoAgricola } from '../entities/tratamiento-agricola.entity';
import type { TipoTratamiento } from '../enums/tipo-tratamiento.enum';
import type { UnidadTratamiento } from '../enums/unidad-tratamiento.enum';

export interface TratamientoRespuesta {
  id: number;
  siembra: {
    id: number;
    tipoCultivo: string;
    cama: {
      id: number;
      codigo: string;
      ubicacion: string;
    };
  };
  tipo: TipoTratamiento;
  producto: string;
  fecha: string;
  cantidad: number;
  unidad: UnidadTratamiento;
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
      cama: {
        id: tratamiento.siembra.cama.id,
        codigo: tratamiento.siembra.cama.codigo,
        ubicacion: tratamiento.siembra.cama.ubicacion,
      },
    },
    tipo: tratamiento.tipo,
    producto: tratamiento.producto,
    fecha: tratamiento.fecha,
    cantidad: tratamiento.cantidad,
    unidad: tratamiento.unidad,
    observaciones: tratamiento.observaciones,
    creadoEn: tratamiento.creadoEn,
    creadoPor: tratamiento.creadoPor,
  };
}
