import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RolUsuario } from '../usuarios/enums/rol-usuario.enum';
import { PermisoRol } from './entities/permiso-rol.entity';
import { ModuloSistema } from './enums/modulo-sistema.enum';
import { NivelPermiso, cubre } from './enums/nivel-permiso.enum';

/** Permisos de un rol: nivel asignado en cada modulo del sistema. */
export type MatrizPermisos = Record<ModuloSistema, NivelPermiso>;

/** Vida de la cache en memoria. Evita ir a la BD en cada peticion. */
const TTL_CACHE_MS = 60_000;

/**
 * Backlog 1.6 - Task: "Crear logica de autorizacion por rol".
 *
 * Resuelve el nivel de acceso de un rol sobre un modulo leyendo la tabla
 * `permisos_rol`. La matriz se cachea en memoria porque se consulta en cada
 * peticion (via PermisosGuard) pero cambia muy poco.
 *
 * Politica de denegar por defecto: si falta la fila, si el rol es desconocido o
 * si la BD no responde, el nivel resultante es NINGUNO. Un error de
 * infraestructura nunca debe abrir accesos.
 */
@Injectable()
export class PermisosService {
  private readonly logger = new Logger(PermisosService.name);
  private cache: Map<RolUsuario, MatrizPermisos> | null = null;
  private cacheExpiraEn = 0;

  constructor(
    @InjectRepository(PermisoRol)
    private readonly permisos: Repository<PermisoRol>,
  ) {}

  /** Nivel de acceso de un rol sobre un modulo. */
  async nivelDe(rol: RolUsuario, modulo: ModuloSistema): Promise<NivelPermiso> {
    const matriz = await this.matrizDe(rol);
    return matriz[modulo];
  }

  /** true si el rol alcanza el nivel requerido en ese modulo. */
  async puede(
    rol: RolUsuario,
    modulo: ModuloSistema,
    nivelRequerido: NivelPermiso,
  ): Promise<boolean> {
    return cubre(await this.nivelDe(rol, modulo), nivelRequerido);
  }

  /**
   * Matriz completa de un rol. La usa el endpoint GET /auth/permisos para que
   * el frontend arme el menu con los mismos datos que aplica el backend.
   */
  async matrizDe(rol: RolUsuario): Promise<MatrizPermisos> {
    const cache = await this.obtenerCache();
    return cache.get(rol) ?? matrizVacia();
  }

  /** Fuerza la relectura de la tabla en la siguiente consulta. */
  invalidarCache(): void {
    this.cache = null;
    this.cacheExpiraEn = 0;
  }

  private async obtenerCache(): Promise<Map<RolUsuario, MatrizPermisos>> {
    if (this.cache && Date.now() < this.cacheExpiraEn) {
      return this.cache;
    }

    try {
      const filas = await this.permisos.find();
      const mapa = new Map<RolUsuario, MatrizPermisos>();

      for (const rol of Object.values(RolUsuario)) {
        mapa.set(rol, matrizVacia());
      }

      for (const fila of filas) {
        const matriz = mapa.get(fila.rol);
        if (matriz) {
          matriz[fila.modulo] = fila.nivel;
        }
      }

      this.cache = mapa;
      this.cacheExpiraEn = Date.now() + TTL_CACHE_MS;
      return mapa;
    } catch (error) {
      // Denegar por defecto: sin matriz no se autoriza nada. Se devuelve un
      // mapa vacio sin cachearlo, para reintentar en la siguiente peticion.
      this.logger.error(
        'No se pudo leer la matriz de permisos; se deniega el acceso por defecto.',
        error instanceof Error ? error.stack : String(error),
      );

      const mapa = new Map<RolUsuario, MatrizPermisos>();
      for (const rol of Object.values(RolUsuario)) {
        mapa.set(rol, matrizVacia());
      }
      return mapa;
    }
  }
}

function matrizVacia(): MatrizPermisos {
  return Object.values(ModuloSistema).reduce((matriz, modulo) => {
    matriz[modulo] = NivelPermiso.NINGUNO;
    return matriz;
  }, {} as MatrizPermisos);
}
