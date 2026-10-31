import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, QueryFailedError, Repository } from 'typeorm';

import { patronContiene } from '../../../common/consultas/patron-like';
import { fechaDeHoy } from '../../../common/validacion/fecha-no-futura.validator';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { CamaCultivo } from '../cama/entities/cama-cultivo.entity';
import { CultivoService } from '../cultivo/cultivo.service';
import { EstadoCamaCultivo } from '../cama/enums/estado-cama-cultivo.enum';
import { Cosecha } from '../cosecha/entities/cosecha.entity';
import { mapearCosecha } from '../cosecha/respuestas/cosecha.mapper';
import { TratamientoAgricola } from '../tratamiento/entities/tratamiento-agricola.entity';
import { mapearTratamiento } from '../tratamiento/respuestas/tratamiento.mapper';
import { ConsultarSiembrasDto } from './dto/consultar-siembras.dto';
import { FinalizarSiembraDto } from './dto/finalizar-siembra.dto';
import { RegistrarSiembraDto } from './dto/registrar-siembra.dto';
import { MotivoFinalizacionSiembra } from './enums/motivo-finalizacion.enum';
import { Siembra } from './entities/siembra.entity';
import {
  contarPorActividad,
  mapearSiembra,
  totalizarPorUnidad,
  type SiembraDetalle,
  type SiembraRespuesta,
} from './respuestas/siembra.mapper';

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const INDICE_SIEMBRA_ACTIVA = 'siembras_cama_activa_unica';
/** La define la migracion 1819-CatalogoCultivos. */
const FK_SIEMBRA_CULTIVO = 'siembras_cultivo_fk';

const MENSAJE_CAMA_OCUPADA =
  'La cama seleccionada ya tiene una siembra activa.';

@Injectable()
export class SiembraService {
  constructor(
    @InjectRepository(CamaCultivo)
    private readonly camasRepo: Repository<CamaCultivo>,
    @InjectRepository(Siembra)
    private readonly siembrasRepo: Repository<Siembra>,
    @InjectRepository(TratamientoAgricola)
    private readonly cuidadosRepo: Repository<TratamientoAgricola>,
    @InjectRepository(Cosecha)
    private readonly cosechasRepo: Repository<Cosecha>,
    private readonly cultivoService: CultivoService,
  ) {}

  /**
   * Todo lo de una siembra en un solo lugar: que se sembro, que cuidados
   * recibio y cuanto se cosecho.
   *
   * Es la vista que ordena el modulo. La huerta se piensa por ciclo —en la
   * cama C-01 se siembra lechuga, se riega, se trata y se cosecha— y al
   * cerrarlo la cama queda libre pero el historial se conserva.
   */
  async obtenerDetalle(id: number): Promise<SiembraDetalle> {
    const siembra = await this.siembrasRepo.findOne({
      where: { id },
      relations: { cama: true },
    });

    if (!siembra) {
      throw new NotFoundException('La siembra no existe.');
    }

    const [cuidados, cosechas] = await Promise.all([
      this.cuidadosRepo.find({
        where: { siembra: { id } },
        relations: { siembra: { cama: true } },
        order: { fecha: 'DESC', id: 'DESC' },
      }),
      this.cosechasRepo.find({
        where: { siembra: { id } },
        relations: { siembra: { cama: true } },
        order: { fecha: 'DESC', id: 'DESC' },
      }),
    ]);

    return {
      siembra: mapearSiembra(siembra),
      cuidados: cuidados.map(mapearTratamiento),
      cosechas: cosechas.map(mapearCosecha),
      produccion: totalizarPorUnidad(cosechas),
      cuidadosPorActividad: contarPorActividad(cuidados),
    };
  }

  async registrar(
    dto: RegistrarSiembraDto,
    actor: UsuarioAutenticado,
  ): Promise<SiembraRespuesta> {
    const cama = await this.camasRepo.findOne({ where: { id: dto.camaId } });
    const cultivo = await this.cultivoService.obtener(dto.cultivoId);

    if (!cama) {
      throw new NotFoundException('La cama de cultivo seleccionada no existe.');
    }

    if (cama.estado !== EstadoCamaCultivo.DISPONIBLE) {
      throw new ConflictException(MENSAJE_CAMA_OCUPADA);
    }

    const activa = await this.siembrasRepo.findOne({
      where: { cama: { id: cama.id }, finalizadaEn: IsNull() },
    });

    if (activa) {
      throw new ConflictException(MENSAJE_CAMA_OCUPADA);
    }

    const siembra = this.siembrasRepo.create({
      cama,
      cultivo,
      // Copia del nombre al momento de sembrar: lo leen filtros y reportes.
      tipoCultivo: cultivo.nombre,
      fechaSiembra: dto.fechaSiembra,
      cantidadSembrada: dto.cantidadSembrada,
      unidadSembrada: dto.unidadSembrada,
      creadoPor: actor.id,
      finalizadaEn: null,
    });
    const guardada = await this.guardarSiembra(siembra);

    guardada.cama = cama;

    cama.estado = EstadoCamaCultivo.SEMBRADA;
    cama.actualizadoPor = actor.id;
    await this.camasRepo.save(cama);

    return mapearSiembra(guardada);
  }

  /**
   * Cierra el ciclo sin borrar la siembra. La cama vuelve a estar disponible
   * y deja de mostrar ese cultivo como actual.
   */
  async finalizar(
    id: number,
    dto: FinalizarSiembraDto,
    actor: UsuarioAutenticado,
  ): Promise<SiembraRespuesta> {
    if (dto.motivo === MotivoFinalizacionSiembra.OTRO && !dto.detalle) {
      throw new BadRequestException('Describa el motivo de finalización.');
    }

    const siembra = await this.siembrasRepo.findOne({
      where: { id },
      relations: { cama: true },
    });

    if (!siembra) {
      throw new NotFoundException('La siembra seleccionada no existe.');
    }

    this.cerrarCiclo(siembra, actor.id, dto.motivo, dto.detalle ?? null);

    await this.camasRepo.save(siembra.cama);
    const guardada = await this.siembrasRepo.save(siembra);

    return mapearSiembra(guardada);
  }

  /**
   * Libera la cama. No borra la siembra ni sus cosechas. Lo usa el cierre
   * sin cosecha y también la cosecha que cierra el ciclo.
   */
  cerrarCiclo(
    siembra: Siembra,
    actorId: string,
    motivo: string | null = null,
    detalle: string | null = null,
  ): void {
    if (siembra.finalizadaEn) {
      throw new ConflictException('Esta siembra ya fue finalizada.');
    }

    siembra.finalizadaEn = fechaDeHoy();
    siembra.motivoFinalizacion = motivo;
    siembra.motivoDetalle = detalle;
    siembra.cama.estado = EstadoCamaCultivo.DISPONIBLE;
    siembra.cama.actualizadoPor = actorId;
  }

  async consultar(filtros: ConsultarSiembrasDto): Promise<SiembraRespuesta[]> {
    const consulta = this.siembrasRepo
      .createQueryBuilder('siembra')
      .innerJoinAndSelect('siembra.cama', 'cama');

    if (filtros.cultivo) {
      consulta.andWhere('lower(siembra.tipoCultivo) LIKE lower(:cultivo)', {
        cultivo: patronContiene(filtros.cultivo),
      });
    }

    if (filtros.fecha) {
      consulta.andWhere('siembra.fechaSiembra = :fecha', {
        fecha: filtros.fecha,
      });
    }

    const siembras = await consulta
      .orderBy('siembra.fechaSiembra', 'DESC')
      .addOrderBy('siembra.id', 'DESC')
      .getMany();

    return siembras.map(mapearSiembra);
  }

  /**
   * La comprobacion de "ya hay una siembra activa" y el INSERT no son
   * atomicos: entre los dos cabe otra peticion, y las dos pasan el control.
   * El indice unico de la base lo impide, pero ese rechazo llega como un
   * error de driver y saldria como 500.
   *
   * Es el mismo conflicto que ya detecta la comprobacion previa, asi que se
   * responde igual: 409 con el mismo mensaje. Solo se traduce la violacion de
   * ESTE indice; cualquier otra se deja pasar para no esconderla.
   */
  private async guardarSiembra(siembra: Siembra): Promise<Siembra> {
    try {
      return await this.siembrasRepo.save(siembra);
    } catch (error) {
      if (this.esSiembraActivaDuplicada(error)) {
        throw new ConflictException(MENSAJE_CAMA_OCUPADA);
      }

      // El cultivo se leyo al principio; si alguien lo borro mientras tanto,
      // la clave foranea rechaza el INSERT y eso saldria como 500.
      if (this.esCultivoInexistente(error)) {
        throw new NotFoundException('El cultivo seleccionado no existe.');
      }

      throw error;
    }
  }

  private esCultivoInexistente(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;

    const driver = error.driverError as {
      code?: string;
      constraint?: string;
    };

    return (
      driver?.code === PG_FOREIGN_KEY_VIOLATION &&
      driver?.constraint === FK_SIEMBRA_CULTIVO
    );
  }

  private esSiembraActivaDuplicada(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;

    const driver = error.driverError as {
      code?: string;
      constraint?: string;
    };

    return (
      driver?.code === PG_UNIQUE_VIOLATION &&
      driver?.constraint === INDICE_SIEMBRA_ACTIVA
    );
  }
}
