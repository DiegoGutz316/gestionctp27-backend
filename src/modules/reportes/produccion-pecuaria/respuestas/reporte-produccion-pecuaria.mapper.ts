import type { Animal } from '../../../pecuaria/animal/entities/animal.entity';
import type { ProduccionPecuaria } from '../../../pecuaria/produccion/entities/produccion-pecuaria.entity';
import type { TipoProduccion } from '../../../pecuaria/produccion/enums/tipo-produccion.enum';
import type { ConsultarReporteProduccionPecuariaDto } from '../dto/consultar-reporte-produccion-pecuaria.dto';

export interface AnimalReporteRespuesta {
  id: number;
  codigo: string;
  nombre: string;
  especie: string;
  estado: string;
}

export interface RegistroReporteProduccionPecuaria {
  id: number;
  tipoProduccion: TipoProduccion;
  cantidad: number;
  fecha: string;
}

export interface TotalReporteProduccionPecuaria {
  tipoProduccion: TipoProduccion;
  cantidad: number;
}

export interface ReporteProduccionPecuariaRespuesta {
  animal: AnimalReporteRespuesta;
  fechaInicio: string;
  fechaFin: string;
  registros: RegistroReporteProduccionPecuaria[];
  totales: TotalReporteProduccionPecuaria[];
}

/**
 * Mismo redondeo que produccion.mapper.ts
 * (src/modules/pecuaria/produccion/respuestas/produccion.mapper.ts). Se deja
 * una copia local pequeña en vez de importar la funcion privada de otro
 * modulo.
 */
function redondearCantidad(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function mapearRegistro(
  registro: ProduccionPecuaria,
): RegistroReporteProduccionPecuaria {
  return {
    id: registro.id,
    tipoProduccion: registro.tipoProduccion,
    cantidad: registro.cantidad,
    fecha: registro.fecha,
  };
}

/**
 * Agrupa por tipoProduccion porque leche, huevos y carne son unidades
 * distintas (L, unid., kg): sumarlas en un solo total no tendria sentido.
 * Mismo criterio que mapearConsultaProduccion.
 */
export function mapearReporteProduccionPecuaria(
  animal: Animal,
  dto: ConsultarReporteProduccionPecuariaDto,
  registros: ProduccionPecuaria[],
): ReporteProduccionPecuariaRespuesta {
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
    fechaInicio: dto.fechaInicio,
    fechaFin: dto.fechaFin,
    registros: registros.map(mapearRegistro),
    totales,
  };
}
