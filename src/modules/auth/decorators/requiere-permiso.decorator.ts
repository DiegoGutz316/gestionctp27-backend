import { SetMetadata } from '@nestjs/common';
import type { ModuloSistema } from '../enums/modulo-sistema.enum';
import type { NivelPermiso } from '../enums/nivel-permiso.enum';

export const CLAVE_PERMISO = 'permisoRequerido';

export interface PermisoRequerido {
  modulo: ModuloSistema;
  nivel: NivelPermiso;
}

/**
 * Backlog 1.6: exige un nivel de acceso sobre un modulo para entrar al
 * endpoint. El nivel efectivo del rol sale de la tabla `permisos_rol`.
 *
 * Ejemplo:
 *   @RequierePermiso(ModuloSistema.USUARIOS, NivelPermiso.COMPLETO)
 *
 * Se puede poner en el controlador (aplica a todos sus metodos) y afinar por
 * metodo: el decorador del metodo gana sobre el de la clase.
 */
export const RequierePermiso = (modulo: ModuloSistema, nivel: NivelPermiso) =>
  SetMetadata(CLAVE_PERMISO, { modulo, nivel } satisfies PermisoRequerido);
