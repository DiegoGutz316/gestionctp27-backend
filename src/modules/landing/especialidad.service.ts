import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';
import { CrearEspecialidadDto } from './dto/crear-especialidad.dto';
import { EditarEspecialidadDto } from './dto/editar-especialidad.dto';
import { EspecialidadLanding } from './entities/especialidad-landing.entity';
import {
  mapearEspecialidad,
  type EspecialidadRespuesta,
} from './respuestas/especialidad.mapper';

const TIPOS_FOTO = new Set(['image/jpeg', 'image/png', 'image/webp']);
const TAMANO_MAXIMO = 5 * 1024 * 1024;

export type ArchivoFoto = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

@Injectable()
export class EspecialidadService {
  constructor(
    @InjectRepository(EspecialidadLanding)
    private readonly repo: Repository<EspecialidadLanding>,
  ) {}

  async listarPublicas(): Promise<EspecialidadRespuesta[]> {
    const filas = await this.repo.find({
      where: { activo: true },
      order: { orden: 'ASC', id: 'ASC' },
    });
    return filas.map(mapearEspecialidad);
  }

  async listarGestion(): Promise<EspecialidadRespuesta[]> {
    const filas = await this.repo.find({
      order: { orden: 'ASC', id: 'ASC' },
    });
    return filas.map(mapearEspecialidad);
  }

  async obtener(id: number): Promise<EspecialidadRespuesta> {
    return mapearEspecialidad(await this.buscarPorId(id));
  }

  async crear(
    dto: CrearEspecialidadDto,
    actor: UsuarioAutenticado,
  ): Promise<EspecialidadRespuesta> {
    let orden = dto.orden;
    if (orden === undefined) {
      const fila = await this.repo
        .createQueryBuilder('e')
        .select('MAX(e.orden)', 'max')
        .getRawOne<{ max: string | null }>();
      orden = Number(fila?.max ?? 0) + 1;
    }

    const creada = await this.repo.save(
      this.repo.create({
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        icono: dto.icono,
        acento: dto.acento,
        fotoAlt: dto.fotoAlt?.trim() || dto.nombre,
        posicionFoto: dto.posicionFoto?.trim() || null,
        fotoEstatica: null,
        orden,
        activo: true,
        creadoPor: actor.id,
        actualizadoPor: null,
      }),
    );
    return mapearEspecialidad(creada);
  }

  async actualizar(
    id: number,
    dto: EditarEspecialidadDto,
    actor: UsuarioAutenticado,
  ): Promise<EspecialidadRespuesta> {
    const especialidad = await this.buscarPorId(id);
    especialidad.nombre = dto.nombre;
    especialidad.descripcion = dto.descripcion;
    especialidad.icono = dto.icono;
    especialidad.acento = dto.acento;
    especialidad.fotoAlt = dto.fotoAlt?.trim() || dto.nombre;
    especialidad.posicionFoto = dto.posicionFoto?.trim() || null;
    if (dto.orden !== undefined) especialidad.orden = dto.orden;
    especialidad.actualizadoPor = actor.id;
    await this.repo.save(especialidad);
    return mapearEspecialidad(especialidad);
  }

  async desactivar(
    id: number,
    actor: UsuarioAutenticado,
  ): Promise<EspecialidadRespuesta> {
    const especialidad = await this.buscarPorId(id);
    especialidad.activo = false;
    especialidad.actualizadoPor = actor.id;
    await this.repo.save(especialidad);
    return mapearEspecialidad(especialidad);
  }

  async reactivar(
    id: number,
    actor: UsuarioAutenticado,
  ): Promise<EspecialidadRespuesta> {
    const especialidad = await this.buscarPorId(id);
    especialidad.activo = true;
    especialidad.actualizadoPor = actor.id;
    await this.repo.save(especialidad);
    return mapearEspecialidad(especialidad);
  }

  async guardarFoto(
    id: number,
    archivo: ArchivoFoto | undefined,
    actor: UsuarioAutenticado,
  ): Promise<EspecialidadRespuesta> {
    if (!archivo?.buffer?.length) {
      throw new BadRequestException('Seleccione una imagen para la foto.');
    }

    const tipo =
      archivo.mimetype === 'image/jpg' ? 'image/jpeg' : archivo.mimetype;
    if (!TIPOS_FOTO.has(tipo)) {
      throw new BadRequestException(
        'La foto debe ser una imagen JPG, PNG o WebP.',
      );
    }
    if (archivo.size > TAMANO_MAXIMO) {
      throw new BadRequestException('La foto no puede superar 5 MB.');
    }

    const especialidad = await this.buscarPorId(id);
    especialidad.fotoTipo = tipo;
    especialidad.actualizadoPor = actor.id;

    await this.repo.update(especialidad.id, {
      foto: archivo.buffer,
      fotoTipo: tipo,
      actualizadoPor: actor.id,
    });

    return mapearEspecialidad(await this.buscarPorId(id));
  }

  async quitarFoto(
    id: number,
    actor: UsuarioAutenticado,
  ): Promise<EspecialidadRespuesta> {
    const especialidad = await this.buscarPorId(id);
    especialidad.fotoTipo = null;
    especialidad.actualizadoPor = actor.id;

    await this.repo.update(especialidad.id, {
      foto: null,
      fotoTipo: null,
      actualizadoPor: actor.id,
    });

    return mapearEspecialidad(await this.buscarPorId(id));
  }

  async obtenerFoto(
    id: number,
    opciones?: { incluirInactivas?: boolean },
  ): Promise<{ contenido: Buffer; tipo: string }> {
    const consulta = this.repo
      .createQueryBuilder('especialidad')
      .addSelect('especialidad.foto')
      .where('especialidad.id = :id', { id });

    if (!opciones?.incluirInactivas) {
      consulta.andWhere('especialidad.activo = true');
    }

    const especialidad = await consulta.getOne();
    if (!especialidad?.foto || !especialidad.fotoTipo) {
      throw new NotFoundException('Esta especialidad no tiene foto subida.');
    }
    return { contenido: especialidad.foto, tipo: especialidad.fotoTipo };
  }

  private async buscarPorId(id: number): Promise<EspecialidadLanding> {
    const especialidad = await this.repo.findOneBy({ id });
    if (!especialidad) {
      throw new NotFoundException('La especialidad no existe.');
    }
    return especialidad;
  }
}
