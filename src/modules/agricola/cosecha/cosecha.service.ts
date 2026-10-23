import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type SelectQueryBuilder } from 'typeorm';

import {
  crearResultadoPaginado,
  paginarQueryBuilder,
} from '../../../common/paginacion/helpers/paginar.helper';

import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { Siembra } from '../siembra/entities/siembra.entity';
import { SiembraService } from '../siembra/siembra.service';

import { ConsultarCosechasDto } from './dto/consultar-cosechas.dto';
import { RegistrarCosechaDto } from './dto/registrar-cosecha.dto';
import { Cosecha } from './entities/cosecha.entity';
import { UnidadMedida } from './enums/unidad-medida.enum';
import {
  mapearCosecha,
  type CosechaRespuesta,
  type ResultadoCosechas,
  type TotalPorCultivo,
  type TotalPorUnidad,
} from './respuestas/cosecha.mapper';

@Injectable()
export class CosechaService {
  constructor(
    @InjectRepository(Siembra)
    private readonly siembrasRepo: Repository<Siembra>,

    @InjectRepository(Cosecha)
    private readonly cosechasRepo: Repository<Cosecha>,

    private readonly siembraService: SiembraService,
  ) {}

  /**
   * Backlog 3.6: "El sistema permite seleccionar una siembra existente" y
   * "La fecha de cosecha no puede ser anterior a la fecha de siembra".
   *
   * Son dos situaciones distintas: una siembra que no existe es un 404, y una
   * fecha imposible es una peticion valida con datos incoherentes.
   */
  async registrar(
    dto: RegistrarCosechaDto,
    actor: UsuarioAutenticado,
  ): Promise<CosechaRespuesta> {
    // La cama se carga aqui porque la respuesta la incluye: sin la relacion,
    // `mapearCosecha` se encontraria `siembra.cama` sin definir.
    const siembra = await this.siembrasRepo.findOne({
      where: { id: dto.siembraId },
      relations: { cama: true },
    });

    if (!siembra) {
      throw new NotFoundException('La siembra seleccionada no existe.');
    }

    if (siembra.finalizadaEn) {
      throw new ConflictException(
        'No se puede registrar una cosecha en una siembra finalizada.',
      );
    }

    // Ambas columnas son `date` y llegan como texto AAAA-MM-DD, formato en el
    // que el orden alfabetico coincide con el cronologico.
    if (dto.fecha < siembra.fechaSiembra) {
      throw new BadRequestException(
        'La fecha de cosecha no puede ser anterior a la fecha de siembra.',
      );
    }

    const guardada = await this.cosechasRepo.manager.transaction(
      async (manager) => {
        const cosecha = manager.create(Cosecha, {
          siembra,
          fecha: dto.fecha,
          cantidadObtenida: dto.cantidadObtenida,
          unidadMedida: dto.unidadMedida,
          observaciones: dto.observaciones ?? null,

          // El responsable sale de la sesion, nunca del cuerpo de la peticion.
          creadoPor: actor.id,
        });

        const creada = await manager.save(cosecha);

        if (dto.cerrarCiclo) {
          this.siembraService.cerrarCiclo(siembra, actor.id);
          await manager.save(siembra.cama);
          await manager.save(siembra);
        }

        return creada;
      },
    );

    guardada.siembra = siembra;

    return mapearCosecha(guardada);
  }

  /**
   * Backlog 3.7: "Los usuarios autorizados pueden consultar el historial de
   * cosechas" y "El sistema permite filtrar cosechas por cultivo o fecha".
   *
   * El cultivo vive en la siembra, asi que el filtro se aplica sobre la tabla
   * unida. Sin filtros se devuelve el historial completo.
   *
   * La fecha se filtra por rango (`desde`/`hasta`, ambos inclusivos): un
   * historial de produccion se consulta por periodos, no por un dia suelto.
   * El parametro `fecha` de antes se sigue aceptando como un rango de un solo
   * dia, para no romper a los clientes ya desplegados.
   *
   * Orden: de la cosecha mas reciente a la mas antigua, desempatando por id
   * para que dos del mismo dia no cambien de posicion entre consultas.
   *
   * La respuesta va paginada: la tabla solo crece, asi que sin acotarla la
   * consulta cargaria y serializaria toda la historia.
   */
  async consultar(filtros: ConsultarCosechasDto): Promise<ResultadoCosechas> {
    const consulta = this.cosechasRepo
      .createQueryBuilder('cosecha')
      .innerJoinAndSelect('cosecha.siembra', 'siembra')
      .innerJoinAndSelect('siembra.cama', 'cama');

    this.aplicarFiltros(consulta, filtros);

    consulta.orderBy('cosecha.fecha', 'DESC').addOrderBy('cosecha.id', 'DESC');

    const { entidades, total } = await paginarQueryBuilder(consulta, filtros);

    return {
      ...crearResultadoPaginado(entidades.map(mapearCosecha), filtros, total),
      totales: await this.totalizar(filtros),
      totalesPorCultivo: await this.totalizarPorCultivo(filtros),
    };
  }

  /**
   * Los filtros se aplican igual a la consulta que se pagina y a la que suma,
   * asi que viven en un solo sitio: si se separaran, la cabecera podria acabar
   * totalizando algo distinto de lo que muestra la tabla.
   *
   * Las dos consultas tienen que traer unidas `siembra` y `cama`, porque el
   * cultivo y la cama viven ahi y no en la cosecha.
   *
   * Los dos extremos de fecha son inclusivos y opcionales por separado: se
   * puede pedir "desde agosto", "hasta ayer" o un dia exacto repitiendo el
   * valor. El `fecha` obsoleto es justo eso, un rango de un solo dia; el DTO
   * impide que venga junto al rango, asi que aqui no hay ambiguedad.
   */
  private aplicarFiltros(
    consulta: SelectQueryBuilder<Cosecha>,
    filtros: ConsultarCosechasDto,
  ): void {
    if (filtros.cultivo) {
      consulta.andWhere('lower(siembra.tipoCultivo) LIKE lower(:cultivo)', {
        cultivo: `%${filtros.cultivo}%`,
      });
    }

    if (filtros.camaId) {
      consulta.andWhere('cama.id = :camaId', { camaId: filtros.camaId });
    }

    if (filtros.ubicacion) {
      consulta.andWhere('lower(cama.ubicacion) = lower(:ubicacion)', {
        ubicacion: filtros.ubicacion,
      });
    }

    const desde = filtros.desde ?? filtros.fecha;
    const hasta = filtros.hasta ?? filtros.fecha;

    if (desde) {
      consulta.andWhere('cosecha.fecha >= :desde', { desde });
    }

    if (hasta) {
      consulta.andWhere('cosecha.fecha <= :hasta', { hasta });
    }
  }

  /**
   * Cuanto se cosecho en todo el filtro, no en la pagina visible: el docente
   * quiere saber la produccion del periodo, y contar registros no se lo dice.
   *
   * Se agrupa por unidad porque kilos y unidades no se suman entre si. La
   * suma la hace la base y no el servidor, que solo ve una pagina.
   */
  /**
   * Cuanto se produjo de cada cultivo, sin mezclar unidades: un cultivo que se
   * cosecha a veces en kilos y a veces por unidad aparece con una fila de cada.
   */
  private async totalizarPorCultivo(
    filtros: ConsultarCosechasDto,
  ): Promise<TotalPorCultivo[]> {
    const consulta = this.cosechasRepo
      .createQueryBuilder('cosecha')
      .innerJoin('cosecha.siembra', 'siembra')
      .innerJoin('siembra.cama', 'cama');

    this.aplicarFiltros(consulta, filtros);

    const filas = await consulta
      .select('siembra.tipoCultivo', 'cultivo')
      .addSelect('cosecha.unidadMedida', 'unidad')
      .addSelect('SUM(cosecha.cantidadObtenida)', 'cantidad')
      .groupBy('siembra.tipoCultivo')
      .addGroupBy('cosecha.unidadMedida')
      .orderBy('siembra.tipoCultivo', 'ASC')
      .addOrderBy('cosecha.unidadMedida', 'ASC')
      .getRawMany<{ cultivo: string; unidad: UnidadMedida; cantidad: string }>();

    return filas.map((fila) => ({
      cultivo: fila.cultivo,
      unidadMedida: fila.unidad,
      cantidad: Number(fila.cantidad),
    }));
  }

  private async totalizar(
    filtros: ConsultarCosechasDto,
  ): Promise<TotalPorUnidad[]> {
    const consulta = this.cosechasRepo
      .createQueryBuilder('cosecha')
      .innerJoin('cosecha.siembra', 'siembra')
      .innerJoin('siembra.cama', 'cama');

    this.aplicarFiltros(consulta, filtros);

    const filas = await consulta
      .select('cosecha.unidadMedida', 'unidad')
      .addSelect('SUM(cosecha.cantidadObtenida)', 'cantidad')
      .groupBy('cosecha.unidadMedida')
      .getRawMany<{ unidad: UnidadMedida; cantidad: string }>();

    // Orden fijo, el del enum, para que la cabecera no cambie de orden entre
    // consultas segun lo que devuelva la base.
    return Object.values(UnidadMedida).flatMap((unidad) => {
      const fila = filas.find((candidata) => candidata.unidad === unidad);

      return fila
        ? [{ unidadMedida: unidad, cantidad: Number(fila.cantidad) }]
        : [];
    });
  }
}
