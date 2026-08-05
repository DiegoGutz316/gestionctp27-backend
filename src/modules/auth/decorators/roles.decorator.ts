import { SetMetadata } from '@nestjs/common';
import type { RolUsuario } from '../../../schemas';

export const CLAVE_ROLES = 'rolesPermitidos';

/**
 * Restringe un endpoint a ciertos roles.
 * Ejemplo (Backlog 1.2):  @Roles('ADMINISTRADOR')
 */
export const Roles = (...roles: RolUsuario[]) =>
  SetMetadata(CLAVE_ROLES, roles);
