import type { EspecialidadLanding } from '../entities/especialidad-landing.entity';
import type { IconoEspecialidad } from '../enums/icono-especialidad.enum';

export type EspecialidadRespuesta = {
  id: number;
  nombre: string;
  descripcion: string;
  icono: IconoEspecialidad;
  acento: string;
  fotoAlt: string;
  posicionFoto: string | null;
  fotoEstatica: string | null;
  tieneFoto: boolean;
  orden: number;
  activo: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
};

export function mapearEspecialidad(
  especialidad: EspecialidadLanding,
): EspecialidadRespuesta {
  return {
    id: especialidad.id,
    nombre: especialidad.nombre,
    descripcion: especialidad.descripcion,
    icono: especialidad.icono,
    acento: especialidad.acento,
    fotoAlt: especialidad.fotoAlt,
    posicionFoto: especialidad.posicionFoto,
    fotoEstatica: especialidad.fotoEstatica,
    tieneFoto: Boolean(especialidad.fotoTipo),
    orden: especialidad.orden,
    activo: especialidad.activo,
    creadoEn: especialidad.creadoEn,
    actualizadoEn: especialidad.actualizadoEn,
  };
}
