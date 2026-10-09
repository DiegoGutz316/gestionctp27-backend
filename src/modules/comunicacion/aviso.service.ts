import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';

import {
  crearResultadoPaginado,
  paginarQueryBuilder,
} from '../../common/paginacion/helpers/paginar.helper';
import type { ResultadoPaginado } from '../../common/paginacion/tipos/resultado-paginado';

import { ConsultarAvisosDto } from './dto/consultar-avisos.dto';
import { EditarAvisoDto } from './dto/editar-aviso.dto';
import { RegistrarAvisoDto } from './dto/registrar-aviso.dto';
import { Aviso } from './entities/aviso.entity';
import { EstadoAviso } from './enums/estado-aviso.enum';
import {
  mapearAviso,
  mapearAvisoPublico,
  type AvisoPublico,
  type AvisoRespuesta,
} from './respuestas/aviso.mapper';

const TIPOS_FLYER = new Set(['image/jpeg', 'image/png', 'image/webp']);
const TAMANO_MAXIMO_FLYER = 5 * 1024 * 1024;

export interface ArchivoFlyer {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Injectable()
export class AvisoService {
  constructor(
    @InjectRepository(Aviso)
    private readonly avisosRepo: Repository<Aviso>,
  ) {}

  /**
   * Backlog 5.5: "El aviso queda asociado al usuario que lo creo" y "El
   * sistema registra la fecha de creacion del aviso".
   */
  async registrar(
    dto: RegistrarAvisoDto,
    actor: UsuarioAutenticado,
  ): Promise<AvisoRespuesta> {
    const aviso = this.avisosRepo.create({
      titulo: dto.titulo,
      descripcion: dto.descripcion,
      categoria: dto.categoria,
      fecha: dto.fecha,

      // Un aviso recien publicado nace activo: es lo que lo deja disponible
      // para consulta sin un paso extra.
      estado: dto.estado ?? EstadoAviso.ACTIVO,

      // El autor sale de la sesion, nunca del cuerpo de la peticion.
      creadoPor: actor.id,
      actualizadoEn: null,
      actualizadoPor: null,
    });

    return mapearAviso(await this.avisosRepo.save(aviso));
  }

  /**
   * Backlog 5.6: la lectura general solo recibe avisos activos.
   *
   * Quien administra (permiso completo) puede pedir inactivos o el conjunto
   * completo para el panel. Sin ese permiso, un pedido de inactivos no
   * devuelve filas y cualquier otro filtro queda en activos.
   *
   * Orden: del aviso mas proximo al mas antiguo por su fecha, desempatando
   * por id para que dos del mismo dia no cambien de posicion entre consultas.
   */
  async consultar(
    filtros: ConsultarAvisosDto,
    puedeAdministrar = false,
  ): Promise<ResultadoPaginado<AvisoRespuesta>> {
    const consulta = this.avisosRepo.createQueryBuilder('aviso');
    const estado = filtros.estado;

    if (estado === EstadoAviso.INACTIVO && !puedeAdministrar) {
      consulta.where('1 = 0');
    } else if (puedeAdministrar && estado === 'TODOS') {
      // Sin filtro de estado: el panel necesita el conjunto completo.
    } else if (puedeAdministrar && estado === EstadoAviso.INACTIVO) {
      consulta.where('aviso.estado = :estado', {
        estado: EstadoAviso.INACTIVO,
      });
    } else {
      consulta.where('aviso.estado = :estado', { estado: EstadoAviso.ACTIVO });
    }

    if (filtros.q) {
      consulta.andWhere('LOWER(aviso.titulo) LIKE LOWER(:q)', {
        q: `%${filtros.q}%`,
      });
    }

    consulta.orderBy('aviso.fecha', 'DESC').addOrderBy('aviso.id', 'DESC');

    const { entidades, total } = await paginarQueryBuilder(consulta, filtros);

    return crearResultadoPaginado(entidades.map(mapearAviso), filtros, total);
  }

  /**
   * Los mismos avisos activos, para la página pública. No incluye quién los
   * creó ni quién los modificó: eso es interno del colegio.
   */
  async consultarPublicos(
    filtros: ConsultarAvisosDto,
  ): Promise<ResultadoPaginado<AvisoPublico>> {
    const consulta = this.avisosRepo
      .createQueryBuilder('aviso')
      .where('aviso.estado = :estado', { estado: EstadoAviso.ACTIVO });

    if (filtros.categoria) {
      consulta.andWhere('aviso.categoria = :categoria', {
        categoria: filtros.categoria,
      });
    }

    consulta.orderBy('aviso.fecha', 'DESC').addOrderBy('aviso.id', 'DESC');

    const { entidades, total } = await paginarQueryBuilder(consulta, filtros);

    return crearResultadoPaginado(
      entidades.map(mapearAvisoPublico),
      filtros,
      total,
    );
  }

  async obtener(id: number): Promise<AvisoRespuesta> {
    return mapearAviso(await this.buscarPorId(id));
  }

  /**
   * Backlog 5.7: actualiza título, descripción, fecha y estado. El aviso no
   * se borra; el responsable y la fecha de la modificación salen de la sesión.
   */
  async actualizar(
    id: number,
    dto: EditarAvisoDto,
    actor: UsuarioAutenticado,
  ): Promise<AvisoRespuesta> {
    const aviso = await this.buscarPorId(id);

    aviso.titulo = dto.titulo;
    aviso.descripcion = dto.descripcion;
    aviso.categoria = dto.categoria;
    aviso.fecha = dto.fecha;
    aviso.estado = dto.estado;
    this.marcarModificacion(aviso, actor);

    // update y no save: el flyer no viene cargado (select: false) y un save
    // podria vaciarlo al persistir la entidad incompleta.
    await this.avisosRepo.update(aviso.id, {
      titulo: aviso.titulo,
      descripcion: aviso.descripcion,
      categoria: aviso.categoria,
      fecha: aviso.fecha,
      estado: aviso.estado,
      actualizadoEn: aviso.actualizadoEn,
      actualizadoPor: aviso.actualizadoPor,
    });

    return mapearAviso(aviso);
  }

  /**
   * Desactivación lógica. La fila permanece para poder consultar el historial
   * y, si hace falta, volver a activarla editando el estado.
   */
  async desactivar(
    id: number,
    actor: UsuarioAutenticado,
  ): Promise<AvisoRespuesta> {
    const aviso = await this.buscarPorId(id);

    if (aviso.estado === EstadoAviso.INACTIVO) {
      throw new ConflictException('El aviso ya está inactivo.');
    }

    aviso.estado = EstadoAviso.INACTIVO;
    this.marcarModificacion(aviso, actor);

    await this.avisosRepo.update(aviso.id, {
      estado: aviso.estado,
      actualizadoEn: aviso.actualizadoEn,
      actualizadoPor: aviso.actualizadoPor,
    });

    return mapearAviso(aviso);
  }

  async guardarFlyer(
    id: number,
    archivo: ArchivoFlyer | undefined,
    actor: UsuarioAutenticado,
  ): Promise<AvisoRespuesta> {
    if (!archivo?.buffer?.length) {
      throw new BadRequestException('Seleccione una imagen para el flyer.');
    }

    const tipo =
      archivo.mimetype === 'image/jpg' ? 'image/jpeg' : archivo.mimetype;

    if (!TIPOS_FLYER.has(tipo)) {
      throw new BadRequestException(
        'El flyer debe ser una imagen JPG, PNG o WebP.',
      );
    }

    if (archivo.size > TAMANO_MAXIMO_FLYER) {
      throw new BadRequestException('El flyer no puede superar 5 MB.');
    }

    const aviso = await this.buscarPorId(id);
    this.marcarModificacion(aviso, actor);
    aviso.flyerTipo = tipo;

    await this.avisosRepo.update(aviso.id, {
      flyer: archivo.buffer,
      flyerTipo: aviso.flyerTipo,
      actualizadoEn: aviso.actualizadoEn,
      actualizadoPor: aviso.actualizadoPor,
    });

    return mapearAviso(aviso);
  }

  async quitarFlyer(
    id: number,
    actor: UsuarioAutenticado,
  ): Promise<AvisoRespuesta> {
    const aviso = await this.buscarPorId(id);
    this.marcarModificacion(aviso, actor);
    aviso.flyerTipo = null;

    await this.avisosRepo.update(aviso.id, {
      flyer: null,
      flyerTipo: null,
      actualizadoEn: aviso.actualizadoEn,
      actualizadoPor: aviso.actualizadoPor,
    });

    return mapearAviso(aviso);
  }

  /** Solo los avisos activos exponen el flyer en la página pública. */
  async obtenerFlyer(
    id: number,
  ): Promise<{ contenido: Buffer; tipo: string }> {
    const aviso = await this.avisosRepo
      .createQueryBuilder('aviso')
      .addSelect('aviso.flyer')
      .where('aviso.id = :id', { id })
      .andWhere('aviso.estado = :estado', { estado: EstadoAviso.ACTIVO })
      .getOne();

    if (!aviso?.flyer || !aviso.flyerTipo) {
      throw new NotFoundException('Este aviso no tiene flyer.');
    }

    return { contenido: aviso.flyer, tipo: aviso.flyerTipo };
  }

  private async buscarPorId(id: number): Promise<Aviso> {
    const aviso = await this.avisosRepo.findOneBy({ id });

    if (!aviso) {
      throw new NotFoundException('El aviso institucional no existe.');
    }

    return aviso;
  }

  private marcarModificacion(aviso: Aviso, actor: UsuarioAutenticado): void {
    aviso.actualizadoEn = new Date();
    aviso.actualizadoPor = actor.id;
  }
}
