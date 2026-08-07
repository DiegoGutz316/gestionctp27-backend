import type { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';

export interface UsuarioSesion {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
}

/** Respuesta pública de login: el JWT viaja solo en cookie httpOnly. */
export interface RespuestaLogin {
  expiraEn: string;
  usuario: UsuarioSesion;
}

/** Resultado interno del servicio (incluye el token para Set-Cookie). */
export interface ResultadoLogin {
  accessToken: string;
  expiraEn: string;
  usuario: UsuarioSesion;
}
