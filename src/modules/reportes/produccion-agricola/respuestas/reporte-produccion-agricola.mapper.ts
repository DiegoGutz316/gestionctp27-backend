import type { Cosecha } from '../../../agricola/cosecha/entities/cosecha.entity';
import {
  mapearCosecha,
  type CosechaRespuesta,
  type TotalPorUnidad,
} from '../../../agricola/cosecha/respuestas/cosecha.mapper';
import type { Siembra } from '../../../agricola/siembra/entities/siembra.entity';
import {
  mapearSiembra,
  type SiembraRespuesta,
} from '../../../agricola/siembra/respuestas/siembra.mapper';
import type { TratamientoAgricola } from '../../../agricola/tratamiento/entities/tratamiento-agricola.entity';
import {
  mapearTratamiento,
  type TratamientoRespuesta,
} from '../../../agricola/tratamiento/respuestas/tratamiento.mapper';

/**
 * Totales del reporte agrícola.
 *
 * Solo se calcula el de cosechas: es la única de las tres entidades con una
 * unidad de medida explícita (`UnidadMedida`, KG o UNIDADES). Ni
 * `Siembra.cantidadSembrada` ni `TratamientoAgricola.cantidad` tienen un
 * campo de unidad en el modelo actual, así que sumarlas produciría un
 * número sin significado claro (¿plantas?, ¿kg?, ¿litros?) — el criterio del
 * backlog pide totales "cuando corresponda", y aquí no corresponde.
 */
export interface TotalesReporteProduccionAgricola {
  cosechas: TotalPorUnidad[];
}

export interface ReporteProduccionAgricolaRespuesta {
  siembras: SiembraRespuesta[];
  cosechas: CosechaRespuesta[];
  tratamientos: TratamientoRespuesta[];
  totales: TotalesReporteProduccionAgricola;
}

export function mapearReporteProduccionAgricola(
  siembras: Siembra[],
  cosechas: Cosecha[],
  tratamientos: TratamientoAgricola[],
  totalesCosecha: TotalPorUnidad[],
): ReporteProduccionAgricolaRespuesta {
  return {
    siembras: siembras.map(mapearSiembra),
    cosechas: cosechas.map(mapearCosecha),
    tratamientos: tratamientos.map(mapearTratamiento),
    totales: {
      cosechas: totalesCosecha,
    },
  };
}
