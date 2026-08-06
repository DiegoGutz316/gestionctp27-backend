import type { RolUsuario } from '../../usuarios/enums/rol-usuario.enum';

export interface UsuarioSesion {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
}

export interface RespuestaLogin {
  accessToken: string;
  expiraEn: string;
  usuario: UsuarioSesion;
}
