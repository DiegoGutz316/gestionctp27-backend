import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { QueryFailedError, Repository } from 'typeorm';

import { CrearUsuarioDto } from '../dto/crear-usuario.dto';
import { Usuario } from '../entities/usuario.entity';

const PG_UNIQUE_VIOLATION = '23505';

export interface UsuarioCreadoRespuesta {
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
  async crear(
    dto: CrearUsuarioDto,
    creadoPor: string,
  ): Promise<UsuarioCreadoRespuesta> {
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
      creadoPor,
      actualizadoPor: null,
    });

    try {
      const usuarioGuardado = await this.usuarios.save(usuario);

      return {
        id: usuarioGuardado.id,
        nombre: usuarioGuardado.nombre,
        correo: usuarioGuardado.correo,
        rol: usuarioGuardado.rol,
        activo: usuarioGuardado.activo,
        creadoPor: usuarioGuardado.creadoPor,
        creadoEn: usuarioGuardado.creadoEn,
        actualizadoEn: usuarioGuardado.actualizadoEn,
      };
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
