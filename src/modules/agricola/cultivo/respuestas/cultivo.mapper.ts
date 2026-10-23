import type { Cultivo } from '../entities/cultivo.entity';
import type { TipoCultivo } from '../enums/tipo-cultivo.enum';

export interface CultivoRespuesta {
  id: number;
  nombre: string;
  tipo: TipoCultivo;
  descripcion: string | null;
  activo: boolean;
  creadoEn: Date;
  creadoPor: string;
}

/** `nombreNormalizado` no sale: es de uso interno para comparar. */
export function mapearCultivo(cultivo: Cultivo): CultivoRespuesta {
  return {
    id: cultivo.id,
    nombre: cultivo.nombre,
    tipo: cultivo.tipo,
    descripcion: cultivo.descripcion,
    activo: cultivo.activo,
    creadoEn: cultivo.creadoEn,
    creadoPor: cultivo.creadoPor,
  };
}
