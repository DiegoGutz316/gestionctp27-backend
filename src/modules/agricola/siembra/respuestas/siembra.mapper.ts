import type { Cosecha } from '../../cosecha/entities/cosecha.entity';
import { UnidadMedida } from '../../cosecha/enums/unidad-medida.enum';
import type {
  CosechaRespuesta,
  TotalPorUnidad,
} from '../../cosecha/respuestas/cosecha.mapper';
import type { TratamientoAgricola } from '../../tratamiento/entities/tratamiento-agricola.entity';
import { ActividadAgricola } from '../../tratamiento/enums/actividad-agricola.enum';
import type { TratamientoRespuesta } from '../../tratamiento/respuestas/tratamiento.mapper';
import type { UnidadSiembra } from '../enums/unidad-siembra.enum';
import type { TipoCultivo } from '../../cultivo/enums/tipo-cultivo.enum';
import type { Siembra } from '../entities/siembra.entity';

export interface SiembraRespuesta {
  id: number;
  cama: {
    id: number;
    codigo: string;
    ubicacion: string;
  };
  tipoCultivo: string;
  cultivo: { id: number; nombre: string; tipo: TipoCultivo } | null;
  fechaSiembra: string;
  cantidadSembrada: number;
  unidadSembrada: UnidadSiembra;
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
    // La relacion solo viene si la consulta la cargo; el nombre historico
    // siempre esta, asi que la pantalla nunca se queda sin que mostrar.
    cultivo: siembra.cultivo
      ? {
          id: siembra.cultivo.id,
          nombre: siembra.cultivo.nombre,
          tipo: siembra.cultivo.tipo,
        }
      : null,
    fechaSiembra: siembra.fechaSiembra,
    cantidadSembrada: siembra.cantidadSembrada,
    unidadSembrada: siembra.unidadSembrada,
    finalizadaEn: siembra.finalizadaEn ?? null,
    motivoFinalizacion: siembra.motivoFinalizacion ?? null,
    motivoDetalle: siembra.motivoDetalle ?? null,
    creadoEn: siembra.creadoEn,
    creadoPor: siembra.creadoPor,
  };
}

/**
 * Todo el ciclo de una siembra: lo sembrado, los cuidados que recibio y lo
 * cosechado, con sus totales.
 */
export interface SiembraDetalle {
  siembra: SiembraRespuesta;
  cuidados: TratamientoRespuesta[];
  cosechas: CosechaRespuesta[];
  produccion: TotalPorUnidad[];
  cuidadosPorActividad: ConteoPorActividad[];
}

export interface ConteoPorActividad {
  actividad: ActividadAgricola;
  cantidad: number;
}

/**
 * Lo cosechado se suma por unidad y nunca entre unidades: 3 kg y 5 lechugas
 * no hacen 8 de nada.
 */
export function totalizarPorUnidad(cosechas: Cosecha[]): TotalPorUnidad[] {
  const porUnidad = new Map<UnidadMedida, number>();

  for (const cosecha of cosechas) {
    porUnidad.set(
      cosecha.unidadMedida,
      (porUnidad.get(cosecha.unidadMedida) ?? 0) + cosecha.cantidadObtenida,
    );
  }

  // Orden fijo, el del enum, para que la cabecera no baile entre consultas.
  return Object.values(UnidadMedida).flatMap((unidad) => {
    const cantidad = porUnidad.get(unidad);

    return cantidad === undefined
      ? []
      : [{ unidadMedida: unidad, cantidad: Number(cantidad.toFixed(2)) }];
  });
}

export function contarPorActividad(
  cuidados: TratamientoAgricola[],
): ConteoPorActividad[] {
  const porActividad = new Map<ActividadAgricola, number>();

  for (const cuidado of cuidados) {
    porActividad.set(
      cuidado.actividad,
      (porActividad.get(cuidado.actividad) ?? 0) + 1,
    );
  }

  return Object.values(ActividadAgricola).flatMap((actividad) => {
    const cantidad = porActividad.get(actividad);

    return cantidad === undefined ? [] : [{ actividad, cantidad }];
  });
}
