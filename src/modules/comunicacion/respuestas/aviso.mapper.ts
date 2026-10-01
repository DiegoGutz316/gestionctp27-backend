import type { Aviso } from '../entities/aviso.entity';
import type { EstadoAviso } from '../enums/estado-aviso.enum';

export interface AvisoRespuesta {
  id: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  estado: EstadoAviso;
  creadoEn: Date;
  creadoPor: string;
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
  };
}
