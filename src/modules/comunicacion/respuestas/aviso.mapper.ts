import type { Aviso } from '../entities/aviso.entity';
import type { CategoriaAviso } from '../enums/categoria-aviso.enum';
import type { EstadoAviso } from '../enums/estado-aviso.enum';

/** Lo que ve una familia en la página pública: sin autores. */
export interface AvisoPublico {
  id: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  categoria: CategoriaAviso | null;
  tieneFlyer: boolean;
  /** Momento en que se publicó. Permite distinguirlo de la fecha de la actividad. */
  creadoEn: string;
}

export interface AvisoRespuesta {
  id: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  categoria: CategoriaAviso | null;
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
    categoria: aviso.categoria ?? null,
    tieneFlyer: aviso.flyerTipo != null,
    creadoEn:
      aviso.creadoEn instanceof Date
        ? aviso.creadoEn.toISOString()
        : String(aviso.creadoEn),
  };
}

export function mapearAviso(aviso: Aviso): AvisoRespuesta {
  return {
    id: aviso.id,
    titulo: aviso.titulo,
    descripcion: aviso.descripcion,
    fecha: aviso.fecha,
    categoria: aviso.categoria ?? null,
    estado: aviso.estado,
    creadoEn: aviso.creadoEn,
    creadoPor: aviso.creadoPor,
    actualizadoEn: aviso.actualizadoEn,
    actualizadoPor: aviso.actualizadoPor,
    tieneFlyer: aviso.flyerTipo != null,
  };
}
