import type { Animal } from '../../animal/entities/animal.entity';
import type { RegistroSalud } from '../entities/registro-salud.entity';
import type { CondicionSalud } from '../enums/condicion-salud.enum';

export interface AnimalSaludRespuesta {
  id: number;
  codigo: string;
  nombre: string;
  especie: string;
  estado: string;
}

export interface SaludRespuesta {
  id: number;
  animalId: number;
  fecha: string;
  condicionObservada: CondicionSalud;
  diagnostico: string | null;
  observaciones: string | null;
  creadoEn: Date;
  creadoPor: string;
}

export interface HistorialSaludRespuesta {
  animal: AnimalSaludRespuesta;
  registros: SaludRespuesta[];
}

export function mapearSalud(registro: RegistroSalud): SaludRespuesta {
  return {
    id: registro.id,
    animalId: registro.animal.id,
    fecha: registro.fecha,
    condicionObservada: registro.condicionObservada,
    diagnostico: registro.diagnostico,
    observaciones: registro.observaciones,
    creadoEn: registro.creadoEn,
    creadoPor: registro.creadoPor,
  };
}

export function mapearHistorialSalud(
  animal: Animal,
  registros: RegistroSalud[],
): HistorialSaludRespuesta {
  return {
    animal: {
      id: animal.id,
      codigo: animal.codigo,
      nombre: animal.nombre,
      especie: animal.especie,
      estado: animal.estado,
    },
    registros: registros.map(mapearSalud),
  };
}
