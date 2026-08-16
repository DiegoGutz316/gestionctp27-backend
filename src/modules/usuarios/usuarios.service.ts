import {
  BadRequestException,
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
} from '../../common/paginacion/helpers/paginar.helper';
import type { ResultadoPaginado } from '../../common/paginacion/tipos/resultado-paginado';
import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { EditarUsuarioDto } from './dto/editar-usuario.dto';
import { PaginarUsuariosDto } from './dto/paginar-usuarios.dto';
import { Usuario } from './entities/usuario.entity';
import { RolUsuario } from './enums/rol-usuario.enum';

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
  rolAsignadoEn: Date | null;
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
    actor?: UsuarioAutenticado,
  ): Promise<UsuarioRespuesta> {
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
      // Auditoria: el administrador que ejecuta la operacion sale del JWT.
      creadoPor: actor?.id ?? null,
      actualizadoPor: null,
      // Backlog 1.6: el rol se asigna en este momento.
      rolAsignadoEn: new Date(),
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
    actor?: UsuarioAutenticado,
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

    const rolCambia = dto.rol !== usuario.rol;

    // Cubre tanto el cambio de rol como la desactivacion, que llegan juntos en
    // este DTO y producen el mismo efecto sobre el acceso administrativo.
    await this.validarNoPerderAccesoAdministrativo(
      usuario,
      { rol: dto.rol, activo: dto.activo },
      actor,
    );

    usuario.nombre = dto.nombre.trim();
    usuario.correo = correoNormalizado;
    usuario.rol = dto.rol;
    usuario.activo = dto.activo;
    usuario.actualizadoPor = actor?.id ?? null;

    if (rolCambia) {
      usuario.rolAsignadoEn = new Date();
    }

    try {
      const guardado = await this.usuarios.save(usuario);
      return this.mapearRespuesta(guardado);
    } catch (error) {
      this.relanzarSiCorreoDuplicado(error);
      throw error;
    }
  }

  /**
   * Backlog 1.6 - Task: "Validar cambios de rol realizados por el
   * administrador".
   *
   * Un usuario pierde su acceso administrativo por dos caminos distintos que
   * tienen el mismo efecto: que le quiten el rol de administrador, o que le
   * desactiven la cuenta. Ambos pasan por aqui para que las salvaguardas no
   * dependan de por cual endpoint entro el cambio (antes la comprobacion del
   * "ultimo administrador" solo cubria el cambio de rol, asi que un PATCH que
   * solo bajaba `activo` se la saltaba).
   *
   * Salvaguardas:
   *  1. Nadie puede quitarse a si mismo el acceso (se autobloquearia).
   *  2. No se puede dejar al sistema sin ningun administrador activo, porque
   *     nadie podria volver a administrar usuarios ni reasignar roles.
   */
  private async validarNoPerderAccesoAdministrativo(
    usuario: Usuario,
    cambios: { rol: RolUsuario; activo: boolean },
    actor?: UsuarioAutenticado,
  ): Promise<void> {
    const pierdeRolAdministrador =
      usuario.rol === RolUsuario.ADMINISTRADOR &&
      cambios.rol !== RolUsuario.ADMINISTRADOR;
    const seDesactiva = usuario.activo && !cambios.activo;

    if (!pierdeRolAdministrador && !seDesactiva) return;

    if (actor?.id === usuario.id) {
      throw new BadRequestException(
        pierdeRolAdministrador
          ? 'No puede cambiar su propio rol de administrador. Solicítelo a otro administrador.'
          : 'No puede desactivar su propia cuenta. Solicítelo a otro administrador.',
      );
    }

    // Solo se puede dejar al sistema sin administradores si el afectado era uno
    // activo; degradar o desactivar a un administrador ya inactivo no resta.
    const eraAdministradorActivo =
      usuario.rol === RolUsuario.ADMINISTRADOR && usuario.activo;

    if (!eraAdministradorActivo) return;

    const administradoresActivos = await this.usuarios.count({
      where: { rol: RolUsuario.ADMINISTRADOR, activo: true },
    });

    if (administradoresActivos <= 1) {
      throw new BadRequestException(
        pierdeRolAdministrador
          ? 'No se puede quitar el rol al único administrador activo del sistema.'
          : 'No se puede desactivar al único administrador activo del sistema.',
      );
    }
  }

  /**
   * Backlog 1.5: desactivación lógica.
   * Conserva el registro y bloquea el acceso (login / JWT).
   */
  async desactivar(
    id: string,
    actor?: UsuarioAutenticado,
  ): Promise<UsuarioRespuesta> {
    const usuario = await this.usuarios.findOne({ where: { id } });

    if (!usuario) {
      throw new NotFoundException('El usuario no existe.');
    }

    if (!usuario.activo) {
      throw new BadRequestException('El usuario ya está desactivado.');
    }

    // Misma validacion que usa actualizar(), para que ambas rutas hacia el
    // mismo cambio de estado se comporten igual.
    await this.validarNoPerderAccesoAdministrativo(
      usuario,
      { rol: usuario.rol, activo: false },
      actor,
    );

    usuario.activo = false;
    usuario.actualizadoPor = actor?.id ?? null;
    const guardado = await this.usuarios.save(usuario);
    return this.mapearRespuesta(guardado);
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
      rolAsignadoEn: usuario.rolAsignadoEn,
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
