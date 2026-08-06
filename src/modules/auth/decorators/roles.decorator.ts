import { SetMetadata } from '@nestjs/common';
import type { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';

export const CLAVE_ROLES = 'rolesPermitidos';

/**
 * Restringe un endpoint a ciertos roles.
 * Ejemplo (Backlog 1.2): @Roles(RolUsuario.ADMINISTRADOR)
 */
export const Roles = (...roles: RolUsuario[]) =>
  SetMetadata(CLAVE_ROLES, roles);
