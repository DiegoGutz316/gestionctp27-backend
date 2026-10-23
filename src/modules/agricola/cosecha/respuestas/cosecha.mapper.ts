import type { ResultadoPaginado } from '../../../../common/paginacion/tipos/resultado-paginado';
import type { Cosecha } from '../entities/cosecha.entity';
import type { UnidadMedida } from '../enums/unidad-medida.enum';

export interface CosechaRespuesta {
  id: number;
  siembra: {
    id: number;
    tipoCultivo: string;
    fechaSiembra: string;
    cama: {
      id: number;
      codigo: string;
      ubicacion: string;
    };
  };
  fecha: string;
  cantidadObtenida: number;
  unidadMedida: UnidadMedida;
  observaciones: string | null;
  creadoEn: Date;
  creadoPor: string;
}

export function mapearCosecha(cosecha: Cosecha): CosechaRespuesta {
  return {
    id: cosecha.id,
    siembra: {
      id: cosecha.siembra.id,
      tipoCultivo: cosecha.siembra.tipoCultivo,
      fechaSiembra: cosecha.siembra.fechaSiembra,

      // Misma forma que `mapearSiembra`, para que la cama se lea igual en
      // todo el modulo agricola.
      cama: {
        id: cosecha.siembra.cama.id,
        codigo: cosecha.siembra.cama.codigo,
        ubicacion: cosecha.siembra.cama.ubicacion,
      },
    },
    fecha: cosecha.fecha,
    cantidadObtenida: cosecha.cantidadObtenida,
    unidadMedida: cosecha.unidadMedida,
    observaciones: cosecha.observaciones,
    creadoEn: cosecha.creadoEn,
    creadoPor: cosecha.creadoPor,
  };
}

/**
 * Lo cosechado en todo el filtro, no en la pagina visible.
 *
 * Va agrupado por unidad porque kilos y unidades no se pueden sumar en un
 * mismo numero: 50 kg de tomate y 120 lechugas no son 170 de nada.
 */
/** Produccion acumulada de un cultivo en una unidad concreta. */
export interface TotalPorCultivo {
  cultivo: string;
  unidadMedida: UnidadMedida;
  cantidad: number;
}

export interface TotalPorUnidad {
  unidadMedida: UnidadMedida;
  cantidad: number;
}

export type ResultadoCosechas = ResultadoPaginado<CosechaRespuesta> & {
  totales: TotalPorUnidad[];
  totalesPorCultivo: TotalPorCultivo[];
};
