import type { RolUsuario } from '../../../schemas';

/** Contenido del JWT que se firma en el login. */
export interface JwtPayload {
  sub: string; // id del usuario (estandar JWT)
  correo: string;
  nombre: string;
  rol: RolUsuario;
}

/** Usuario autenticado que Nest inyecta en request.user. */
export interface UsuarioAutenticado {
  id: string;
  correo: string;
  nombre: string;
  rol: RolUsuario;
}
