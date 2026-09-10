import type { Animal } from '../../animal/entities/animal.entity';
import type { ProduccionPecuaria } from '../entities/produccion-pecuaria.entity';
import type { TipoProduccion } from '../enums/tipo-produccion.enum';
import type { ConsultarProduccionDto } from '../dto/consultar-produccion.dto';

export interface AnimalProduccionRespuesta {
  id: number;
  codigo: string;
  nombre: string;
  especie: string;
  estado: string;
}

export interface ProduccionRespuesta {
  id: number;
  animalId: number;
  tipoProduccion: TipoProduccion;
  cantidad: number;
  fecha: string;
  creadoEn: Date;
  creadoPor: string;
}

export interface TotalProduccionRespuesta {
  tipoProduccion: TipoProduccion;
  cantidad: number;
}

export interface ConsultaProduccionRespuesta {
  animal: AnimalProduccionRespuesta;
  desde: string | null;
  registros: ProduccionRespuesta[];
  totales: TotalProduccionRespuesta[];
}

function redondearCantidad(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function mapearProduccion(
  registro: ProduccionPecuaria,
): ProduccionRespuesta {
  return {
    id: registro.id,
    animalId: registro.animal.id,
    tipoProduccion: registro.tipoProduccion,
    cantidad: registro.cantidad,
    fecha: registro.fecha,
    creadoEn: registro.creadoEn,
    creadoPor: registro.creadoPor,
  };
}

export function mapearConsultaProduccion(
  animal: Animal,
  dto: ConsultarProduccionDto,
  registros: ProduccionPecuaria[],
): ConsultaProduccionRespuesta {
  const porTipo = new Map<TipoProduccion, number>();

  for (const registro of registros) {
    const acumulado = porTipo.get(registro.tipoProduccion) ?? 0;
    porTipo.set(
      registro.tipoProduccion,
      redondearCantidad(acumulado + registro.cantidad),
    );
  }

  const totales = [...porTipo.entries()]
    .sort(([izquierda], [derecha]) => izquierda.localeCompare(derecha))
    .map(([tipoProduccion, cantidad]) => ({
      tipoProduccion,
      cantidad,
    }));

  return {
    animal: {
      id: animal.id,
      codigo: animal.codigo,
      nombre: animal.nombre,
      especie: animal.especie,
      estado: animal.estado,
    },
    desde: dto.desde ?? null,
    registros: registros.map(mapearProduccion),
    totales,
  };
}
