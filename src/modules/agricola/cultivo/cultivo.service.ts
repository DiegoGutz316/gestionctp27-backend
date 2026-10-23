import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { patronContiene } from '../../../common/consultas/patron-like';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { Siembra } from '../siembra/entities/siembra.entity';
import { ConsultarCultivosDto } from './dto/consultar-cultivos.dto';
import { EditarCultivoDto } from './dto/editar-cultivo.dto';
import { RegistrarCultivoDto } from './dto/registrar-cultivo.dto';
import { Cultivo } from './entities/cultivo.entity';
import { mapearCultivo, type CultivoRespuesta } from './respuestas/cultivo.mapper';

const PG_UNIQUE_VIOLATION = '23505';

/** El indice unico es quien decide, no una consulta previa. */
function esNombreRepetido(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error as { driverError?: { code?: string } }).driverError?.code ===
      PG_UNIQUE_VIOLATION
  );
}

/**
 * Minuscula y sin tildes, que es por donde se comparan los nombres: asi
 * «Maíz», «maiz» y «MAIZ» son el mismo cultivo.
 */
export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

@Injectable()
export class CultivoService {
  constructor(
    @InjectRepository(Cultivo)
    private readonly cultivosRepo: Repository<Cultivo>,
    @InjectRepository(Siembra)
    private readonly siembrasRepo: Repository<Siembra>,
  ) {}

  async registrar(
    dto: RegistrarCultivoDto,
    actor: UsuarioAutenticado,
  ): Promise<CultivoRespuesta> {
    const cultivo = this.cultivosRepo.create({
      nombre: dto.nombre,
      nombreNormalizado: normalizarNombre(dto.nombre),
      tipo: dto.tipo,
      descripcion: dto.descripcion ?? null,
      activo: dto.activo ?? true,
      creadoPor: actor.id,
    });

    try {
      return mapearCultivo(await this.cultivosRepo.save(cultivo));
    } catch (error) {
      // El indice unico es quien decide, no una consulta previa: entre la
      // comprobacion y el insert cabe otra peticion con el mismo nombre.
      if (esNombreRepetido(error)) {
        throw new ConflictException(
          `Ya existe un cultivo registrado con el nombre "${dto.nombre}".`,
        );
      }

      throw error;
    }
  }

  /**
   * Para el selector de siembras basta con los activos; el listado del
   * catalogo los muestra todos.
   */
  async consultar(filtros: ConsultarCultivosDto): Promise<CultivoRespuesta[]> {
    const consulta = this.cultivosRepo.createQueryBuilder('cultivo');

    if (filtros.soloActivos) {
      consulta.andWhere('cultivo.activo = true');
    }

    if (filtros.tipo) {
      consulta.andWhere('cultivo.tipo = :tipo', { tipo: filtros.tipo });
    }

    if (filtros.q) {
      consulta.andWhere('cultivo.nombreNormalizado LIKE :q', {
        q: patronContiene(normalizarNombre(filtros.q)),
      });
    }

    const cultivos = await consulta
      .orderBy('cultivo.nombre', 'ASC')
      .getMany();

    return cultivos.map(mapearCultivo);
  }

  async editar(id: number, dto: EditarCultivoDto): Promise<CultivoRespuesta> {
    const cultivo = await this.obtener(id);

    if (dto.nombre !== undefined) {
      cultivo.nombre = dto.nombre;
      cultivo.nombreNormalizado = normalizarNombre(dto.nombre);
    }
    if (dto.tipo !== undefined) cultivo.tipo = dto.tipo;
    if (dto.descripcion !== undefined) {
      cultivo.descripcion = dto.descripcion ?? null;
    }
    if (dto.activo !== undefined) cultivo.activo = dto.activo;

    try {
      return mapearCultivo(await this.cultivosRepo.save(cultivo));
    } catch (error) {
      if (esNombreRepetido(error)) {
        throw new ConflictException(
          `Ya existe un cultivo registrado con el nombre "${cultivo.nombre}".`,
        );
      }

      throw error;
    }
  }

  /**
   * Solo se borra un cultivo que nadie haya sembrado. Si tiene siembras, la
   * clave foranea lo impediria igual: se avisa antes, con el motivo y con la
   * salida, que es desactivarlo para que deje de ofrecerse sin perder el
   * historial.
   */
  async eliminar(id: number): Promise<void> {
    const cultivo = await this.obtener(id);

    const siembras = await this.siembrasRepo.count({
      where: { cultivo: { id } },
    });

    if (siembras > 0) {
      throw new ConflictException(
        `No se puede eliminar el cultivo "${cultivo.nombre}": tiene ${siembras} ` +
          `${siembras === 1 ? 'siembra registrada' : 'siembras registradas'}. ` +
          'Desactívelo para que deje de ofrecerse al sembrar.',
      );
    }

    await this.cultivosRepo.delete(id);
  }

  async obtener(id: number): Promise<Cultivo> {
    const cultivo = await this.cultivosRepo.findOne({ where: { id } });

    if (!cultivo) {
      throw new NotFoundException('El cultivo seleccionado no existe.');
    }

    return cultivo;
  }
}
