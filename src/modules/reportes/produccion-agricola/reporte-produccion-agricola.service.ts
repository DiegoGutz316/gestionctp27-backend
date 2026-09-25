import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type SelectQueryBuilder } from 'typeorm';

import { Cosecha } from '../../agricola/cosecha/entities/cosecha.entity';
import { UnidadMedida } from '../../agricola/cosecha/enums/unidad-medida.enum';
import type { TotalPorUnidad } from '../../agricola/cosecha/respuestas/cosecha.mapper';
import { Siembra } from '../../agricola/siembra/entities/siembra.entity';
import { TratamientoAgricola } from '../../agricola/tratamiento/entities/tratamiento-agricola.entity';

import { ConsultarReporteProduccionAgricolaDto } from './dto/consultar-reporte-produccion-agricola.dto';
import {
  mapearReporteProduccionAgricola,
  type ReporteProduccionAgricolaRespuesta,
} from './respuestas/reporte-produccion-agricola.mapper';

@Injectable()
export class ReporteProduccionAgricolaService {
  constructor(
    @InjectRepository(Siembra)
    private readonly siembrasRepo: Repository<Siembra>,

    @InjectRepository(Cosecha)
    private readonly cosechasRepo: Repository<Cosecha>,

    @InjectRepository(TratamientoAgricola)
    private readonly tratamientosRepo: Repository<TratamientoAgricola>,
  ) {}

  /**
   * Backlog 5.2: "consultar siembras, cosechas y tratamientos" con los mismos
   * filtros de cultivo, cama y periodo. Son tres consultas independientes,
   * no una sola: no existe una tabla o vista que las unifique, y forzarlas a
   * una sola entidad mezclaria conceptos distintos (sembrar, cosechar,
   * tratar).
   *
   * Sin resultados en ninguna de las tres, la respuesta sigue siendo valida:
   * arreglos vacios y totales vacios, nunca un 404 — el rango de fechas puede
   * simplemente no tener actividad registrada.
   */
  async generar(
    dto: ConsultarReporteProduccionAgricolaDto,
  ): Promise<ReporteProduccionAgricolaRespuesta> {
    const [siembras, cosechas, tratamientos, totalesCosecha] =
      await Promise.all([
        this.consultarSiembras(dto),
        this.consultarCosechas(dto),
        this.consultarTratamientos(dto),
        this.totalizarCosechas(dto),
      ]);

    return mapearReporteProduccionAgricola(
      siembras,
      cosechas,
      tratamientos,
      totalesCosecha,
    );
  }

  /**
   * La fecha de referencia de una siembra es `fechaSiembra`, siguiendo la
   * instruccion del backlog.
   */
  private async consultarSiembras(
    dto: ConsultarReporteProduccionAgricolaDto,
  ): Promise<Siembra[]> {
    const consulta = this.siembrasRepo
      .createQueryBuilder('siembra')
      .innerJoinAndSelect('siembra.cama', 'cama')
      .where('siembra.fechaSiembra >= :fechaInicio', {
        fechaInicio: dto.fechaInicio,
      })
      .andWhere('siembra.fechaSiembra <= :fechaFin', {
        fechaFin: dto.fechaFin,
      });

    if (dto.cultivo) {
      consulta.andWhere('lower(siembra.tipoCultivo) LIKE lower(:cultivo)', {
        cultivo: `%${dto.cultivo}%`,
      });
    }

    if (dto.camaId) {
      consulta.andWhere('cama.id = :camaId', { camaId: dto.camaId });
    }

    return await consulta
      .orderBy('siembra.fechaSiembra', 'DESC')
      .addOrderBy('siembra.id', 'DESC')
      .getMany();
  }

  private async consultarCosechas(
    dto: ConsultarReporteProduccionAgricolaDto,
  ): Promise<Cosecha[]> {
    const consulta = this.cosechasRepo
      .createQueryBuilder('cosecha')
      .innerJoinAndSelect('cosecha.siembra', 'siembra')
      .innerJoinAndSelect('siembra.cama', 'cama');

    this.aplicarFiltrosCosecha(consulta, dto);

    return await consulta
      .orderBy('cosecha.fecha', 'DESC')
      .addOrderBy('cosecha.id', 'DESC')
      .getMany();
  }

  /**
   * Mismo patron que CosechaService.totalizar
   * (src/modules/agricola/cosecha/cosecha.service.ts): se agrupa por unidad
   * de medida porque kilos y unidades no se suman entre si, y la suma la
   * hace la base de datos, no el servidor.
   */
  private async totalizarCosechas(
    dto: ConsultarReporteProduccionAgricolaDto,
  ): Promise<TotalPorUnidad[]> {
    const consulta = this.cosechasRepo
      .createQueryBuilder('cosecha')
      .innerJoin('cosecha.siembra', 'siembra')
      .innerJoin('siembra.cama', 'cama');

    this.aplicarFiltrosCosecha(consulta, dto);

    const filas = await consulta
      .select('cosecha.unidadMedida', 'unidad')
      .addSelect('SUM(cosecha.cantidadObtenida)', 'cantidad')
      .groupBy('cosecha.unidadMedida')
      .getRawMany<{ unidad: UnidadMedida; cantidad: string }>();

    return Object.values(UnidadMedida).flatMap((unidad) => {
      const fila = filas.find((candidata) => candidata.unidad === unidad);

      return fila
        ? [{ unidadMedida: unidad, cantidad: Number(fila.cantidad) }]
        : [];
    });
  }

  /**
   * Filtros compartidos entre la consulta de cosechas y su totalizacion:
   * si vivieran por separado, el total podria acabar sumando algo distinto
   * de lo que muestra la lista. La fecha de referencia es `Cosecha.fecha`.
   */
  private aplicarFiltrosCosecha(
    consulta: SelectQueryBuilder<Cosecha>,
    dto: ConsultarReporteProduccionAgricolaDto,
  ): void {
    if (dto.cultivo) {
      consulta.andWhere('lower(siembra.tipoCultivo) LIKE lower(:cultivo)', {
        cultivo: `%${dto.cultivo}%`,
      });
    }

    if (dto.camaId) {
      consulta.andWhere('cama.id = :camaId', { camaId: dto.camaId });
    }

    consulta.andWhere('cosecha.fecha >= :fechaInicio', {
      fechaInicio: dto.fechaInicio,
    });
    consulta.andWhere('cosecha.fecha <= :fechaFin', {
      fechaFin: dto.fechaFin,
    });
  }

  /**
   * La funcionalidad actual de TratamientoService solo filtra por cultivo
   * (exacto, obligatorio); el reporte necesita cultivo/cama/fecha opcionales
   * y combinables, asi que consulta la entidad directamente en vez de
   * reutilizar ese servicio.
   */
  private async consultarTratamientos(
    dto: ConsultarReporteProduccionAgricolaDto,
  ): Promise<TratamientoAgricola[]> {
    const consulta = this.tratamientosRepo
      .createQueryBuilder('tratamiento')
      .innerJoinAndSelect('tratamiento.siembra', 'siembra')
      .innerJoin('siembra.cama', 'cama')
      .where('tratamiento.fecha >= :fechaInicio', {
        fechaInicio: dto.fechaInicio,
      })
      .andWhere('tratamiento.fecha <= :fechaFin', { fechaFin: dto.fechaFin });

    if (dto.cultivo) {
      consulta.andWhere('lower(siembra.tipoCultivo) LIKE lower(:cultivo)', {
        cultivo: `%${dto.cultivo}%`,
      });
    }

    if (dto.camaId) {
      consulta.andWhere('cama.id = :camaId', { camaId: dto.camaId });
    }

    return await consulta
      .orderBy('tratamiento.fecha', 'DESC')
      .addOrderBy('tratamiento.id', 'DESC')
      .getMany();
  }
}
