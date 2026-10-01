import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';

import {
  crearResultadoPaginado,
  paginarQueryBuilder,
} from '../../common/paginacion/helpers/paginar.helper';
import type { ResultadoPaginado } from '../../common/paginacion/tipos/resultado-paginado';

import { ConsultarAvisosDto } from './dto/consultar-avisos.dto';
import { RegistrarAvisoDto } from './dto/registrar-aviso.dto';
import { Aviso } from './entities/aviso.entity';
import { EstadoAviso } from './enums/estado-aviso.enum';
import { mapearAviso, type AvisoRespuesta } from './respuestas/aviso.mapper';

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
      fecha: dto.fecha,

      // Un aviso recien publicado nace activo: es lo que lo deja disponible
      // para consulta sin un paso extra.
      estado: dto.estado ?? EstadoAviso.ACTIVO,

      // El autor sale de la sesion, nunca del cuerpo de la peticion.
      creadoPor: actor.id,
    });

    return mapearAviso(await this.avisosRepo.save(aviso));
  }

  /**
   * Backlog 5.6: "Los usuarios autorizados pueden visualizar los avisos
   * activos" y "Los avisos inactivos no se muestran a los usuarios
   * generales".
   *
   * El filtro por estado no es opcional ni configurable: este endpoint
   * devuelve unicamente los activos. Dejarlo elegible abriria la puerta a que
   * cualquiera con LECTURA pidiera los inactivos, que es justo lo que el
   * criterio prohibe.
   *
   * Orden: del aviso mas proximo al mas antiguo por su fecha, desempatando
   * por id para que dos del mismo dia no cambien de posicion entre consultas.
   */
  async consultar(
    filtros: ConsultarAvisosDto,
  ): Promise<ResultadoPaginado<AvisoRespuesta>> {
    const consulta = this.avisosRepo
      .createQueryBuilder('aviso')
      .where('aviso.estado = :estado', { estado: EstadoAviso.ACTIVO })
      .orderBy('aviso.fecha', 'DESC')
      .addOrderBy('aviso.id', 'DESC');

    const { entidades, total } = await paginarQueryBuilder(consulta, filtros);

    return crearResultadoPaginado(entidades.map(mapearAviso), filtros, total);
  }
}
