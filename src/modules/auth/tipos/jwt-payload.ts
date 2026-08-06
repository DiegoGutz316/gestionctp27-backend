import type { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';

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

/** Forma de la solicitud HTTP después de que Passport valida el JWT. */
export interface SolicitudAutenticada {
  user?: UsuarioAutenticado;
}
