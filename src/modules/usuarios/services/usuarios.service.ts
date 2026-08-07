import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Brackets, QueryFailedError, Repository } from 'typeorm';

import { ConsultarUsuariosDto } from '../dto/consultar-usuarios.dto';
import { CrearUsuarioDto } from '../dto/crear-usuario.dto';
import { Usuario } from '../entities/usuario.entity';
import { ETIQUETA_ROL, RolUsuario } from '../enums/rol-usuario.enum';

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

export interface UsuarioListado {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  activo: boolean;
}

export interface ListarUsuariosRespuesta {
  total: number;
  usuarios: UsuarioListado[];
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
  async crear(dto: CrearUsuarioDto): Promise<UsuarioCreadoRespuesta> {
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
   * Backlog 1.3: consultar usuarios registrados.
   *
   * `busqueda` coincide por nombre, correo o la etiqueta legible del rol
   * (p. ej. "Docente pecuario"); `rol` filtra de forma exacta y es
   * independiente de `busqueda`. La contraseña nunca se selecciona: el
   * campo tiene `select: false` en la entidad.
   */
  async listar(filtros: ConsultarUsuariosDto): Promise<ListarUsuariosRespuesta> {
    const consulta = this.usuarios
      .createQueryBuilder('usuario')
      .select([
        'usuario.id',
        'usuario.nombre',
        'usuario.correo',
        'usuario.rol',
        'usuario.activo',
      ]);

    if (filtros.busqueda) {
      const textoBusqueda = filtros.busqueda.replace(/[\\%_]/g, '\\$&');
      const texto = `%${textoBusqueda}%`;
      const rolesPorEtiqueta = this.rolesConEtiquetaQueCoincide(filtros.busqueda);

      consulta.andWhere(
        new Brackets((qb) => {
          qb.where("usuario.nombre ILIKE :texto ESCAPE '\\'", { texto }).orWhere(
            "usuario.correo ILIKE :texto ESCAPE '\\'",
            { texto },
          );

          // `rol` es un enum en Postgres: un IN con arreglo vacío o un
          // valor centinela invalido rompe la consulta, asi que la
          // condicion solo se agrega si hay roles que de verdad coinciden.
          if (rolesPorEtiqueta.length) {
            qb.orWhere('usuario.rol IN (:...rolesPorEtiqueta)', {
              rolesPorEtiqueta,
            });
          }
        }),
      );
    }

    if (filtros.rol) {
      consulta.andWhere('usuario.rol = :rol', { rol: filtros.rol });
    }

    consulta.orderBy(`usuario.${filtros.ordenarPor}`, filtros.orden);

    consulta.skip((filtros.pagina - 1) * filtros.limite).take(filtros.limite);

    const [usuarios, total] = await consulta.getManyAndCount();

    return {
      total,
      usuarios,
    };
  }

  private rolesConEtiquetaQueCoincide(busqueda: string): RolUsuario[] {
    const texto = busqueda.toLowerCase();
    return (Object.keys(ETIQUETA_ROL) as RolUsuario[]).filter((rol) =>
      ETIQUETA_ROL[rol].toLowerCase().includes(texto),
    );
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
   * Backlog 1.5: desactivar un usuario (baja logica, sin DELETE fisico).
   *
   * Idempotente: si el usuario ya esta inactivo, no vuelve a escribir en la
   * fila y devuelve su estado actual tal cual.
   */
  async desactivar(id: string): Promise<UsuarioListado> {
    const usuario = await this.buscarPorId(id);

    if (!usuario) {
      throw new NotFoundException('El usuario no existe.');
    }

    if (!usuario.activo) {
      return this.aListado(usuario);
    }

    await this.usuarios.update(id, { activo: false });
    const desactivado = await this.buscarPorId(id);

    return this.aListado(desactivado!);
  }

  private aListado(usuario: Usuario): UsuarioListado {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      activo: usuario.activo,
    };
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
