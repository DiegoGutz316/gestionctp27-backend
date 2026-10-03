import type { Aviso } from '../entities/aviso.entity';
import type { EstadoAviso } from '../enums/estado-aviso.enum';

/** Lo que ve una familia en la página pública: sin autores ni auditoría. */
export interface AvisoPublico {
  id: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  tieneFlyer: boolean;
}

export interface AvisoRespuesta {
  id: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  estado: EstadoAviso;
  creadoEn: Date;
  creadoPor: string;
  actualizadoEn: Date | null;
  actualizadoPor: string | null;
  tieneFlyer: boolean;
}

export function mapearAvisoPublico(aviso: Aviso): AvisoPublico {
  return {
    id: aviso.id,
    titulo: aviso.titulo,
    descripcion: aviso.descripcion,
    fecha: aviso.fecha,
    tieneFlyer: aviso.flyerTipo != null,
  };
}

export function mapearAviso(aviso: Aviso): AvisoRespuesta {
  return {
    id: aviso.id,
    titulo: aviso.titulo,
    descripcion: aviso.descripcion,
    fecha: aviso.fecha,
    estado: aviso.estado,
    creadoEn: aviso.creadoEn,
    creadoPor: aviso.creadoPor,
    actualizadoEn: aviso.actualizadoEn,
    actualizadoPor: aviso.actualizadoPor,
    tieneFlyer: aviso.flyerTipo != null,
  };
}
