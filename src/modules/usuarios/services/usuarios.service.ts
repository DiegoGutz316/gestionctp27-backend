import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { QueryFailedError, Repository } from 'typeorm';

import {
  crearResultadoPaginado,
  paginarQueryBuilder,
} from '../../../common/paginacion/helpers/paginar.helper';
import type { ResultadoPaginado } from '../../../common/paginacion/tipos/resultado-paginado';
import { CrearUsuarioDto } from '../dto/crear-usuario.dto';
import { EditarUsuarioDto } from '../dto/editar-usuario.dto';
import { PaginarUsuariosDto } from '../dto/paginar-usuarios.dto';
import { Usuario } from '../entities/usuario.entity';

const PG_UNIQUE_VIOLATION = '23505';

export interface UsuarioRespuesta {
  id: string;
  nombre: string;
  correo: string;
  rol: Usuario['rol'];
  activo: boolean;
  creadoPor: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Acceso a datos y operaciones del módulo de usuarios.
 *
 * Mantiene los métodos utilizados por AuthModule y agrega la funcionalidad
 * correspondiente al Backlog 1.2: creación de usuarios.
 */
@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>,
  ) {}

  /**
   * Backlog 1.2: crear un usuario.
   *
   * La contraseña se recibe en texto plano únicamente durante esta operación
   * y se transforma inmediatamente en un hash bcrypt.
   */
  async crear(dto: CrearUsuarioDto): Promise<UsuarioRespuesta> {
    const correoNormalizado = dto.correo.trim().toLowerCase();

    const usuarioExistente = await this.usuarios.findOne({
      where: {
        correo: correoNormalizado,
      },
    });

    if (usuarioExistente) {
      throw new ConflictException(
        'Ya existe un usuario registrado con ese correo.',
      );
    }

    const contrasenaHash = await bcrypt.hash(dto.contrasena, 12);

    const usuario = this.usuarios.create({
      nombre: dto.nombre.trim(),
      correo: correoNormalizado,
      contrasenaHash,
      rol: dto.rol,
      activo: dto.activo ?? true,
      ultimoAcceso: null,
      actualizadoPor: null,
    });

    try {
      const usuarioGuardado = await this.usuarios.save(usuario);
      return this.mapearRespuesta(usuarioGuardado);
    } catch (error) {
      this.relanzarSiCorreoDuplicado(error);
      throw error;
    }
  }

  async listar(
    filtros: PaginarUsuariosDto,
  ): Promise<ResultadoPaginado<UsuarioRespuesta>> {
    const query = this.usuarios
      .createQueryBuilder('usuario')
      .orderBy('usuario.nombre', filtros.order ?? 'ASC');

    if (filtros.q) {
      query.andWhere(
        '(LOWER(usuario.nombre) LIKE LOWER(:q) OR LOWER(usuario.correo) LIKE LOWER(:q))',
        { q: `%${filtros.q}%` },
      );
    }

    if (filtros.rol) {
      query.andWhere('usuario.rol = :rol', { rol: filtros.rol });
    }

    if (typeof filtros.activo === 'boolean') {
      query.andWhere('usuario.activo = :activo', { activo: filtros.activo });
    }

    const { entidades, total } = await paginarQueryBuilder(query, filtros);
    return crearResultadoPaginado(
      entidades.map((usuario) => this.mapearRespuesta(usuario)),
      filtros,
      total,
    );
  }

  async obtenerPorId(id: string): Promise<UsuarioRespuesta> {
    const usuario = await this.usuarios.findOne({ where: { id } });

    if (!usuario) {
      throw new NotFoundException('El usuario no existe.');
    }

    return this.mapearRespuesta(usuario);
  }

  async actualizar(
    id: string,
    dto: EditarUsuarioDto,
  ): Promise<UsuarioRespuesta> {
    const usuario = await this.usuarios.findOne({ where: { id } });

    if (!usuario) {
      throw new NotFoundException('El usuario no existe.');
    }

    const correoNormalizado = dto.correo.trim().toLowerCase();

    if (correoNormalizado !== usuario.correo) {
      const duplicado = await this.usuarios.findOne({
        where: { correo: correoNormalizado },
      });

      if (duplicado) {
        throw new ConflictException(
          'Ya existe un usuario registrado con ese correo.',
        );
      }
    }

    usuario.nombre = dto.nombre.trim();
    usuario.correo = correoNormalizado;
    usuario.rol = dto.rol;
    usuario.activo = dto.activo;

    try {
      const guardado = await this.usuarios.save(usuario);
      return this.mapearRespuesta(guardado);
    } catch (error) {
      this.relanzarSiCorreoDuplicado(error);
      throw error;
    }
  }

  /**
   * Único método que trae el hash de la contraseña.
   * Uso exclusivo del proceso de autenticación.
   */
  buscarParaAutenticar(correo: string): Promise<Usuario | null> {
    return this.usuarios
      .createQueryBuilder('usuario')
      .addSelect('usuario.contrasenaHash')
      .where('usuario.correo = :correo', {
        correo: correo.trim().toLowerCase(),
      })
      .getOne();
  }

  buscarPorId(id: string): Promise<Usuario | null> {
    return this.usuarios.findOne({
      where: {
        id,
      },
    });
  }

  /**
   * Registra la fecha del último inicio de sesión exitoso.
   */
  async registrarUltimoAcceso(id: string): Promise<void> {
    await this.usuarios.update(id, {
      ultimoAcceso: new Date(),
    });
  }

  private mapearRespuesta(usuario: Usuario): UsuarioRespuesta {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      activo: usuario.activo,
      creadoPor: usuario.creadoPor,
      creadoEn: usuario.creadoEn,
      actualizadoEn: usuario.actualizadoEn,
    };
  }

  /**
   * Protección adicional ante dos solicitudes simultáneas con el mismo correo.
   * La base de datos rechaza la segunda mediante su índice UNIQUE.
   */
  private relanzarSiCorreoDuplicado(error: unknown): void {
    if (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION
    ) {
      throw new ConflictException(
        'Ya existe un usuario registrado con ese correo.',
      );
    }
  }
}
