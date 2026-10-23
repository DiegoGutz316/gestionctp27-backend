import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiCookieAuth, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';

import { AuthService } from './auth.service';
import { PermisosService } from './permisos.service';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';
import { LoginDto } from './dto/login.dto';
import { Publico } from './decorators/publico.decorator';
import { UsuarioActual } from './decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from './tipos/jwt-payload';
import type { RespuestaLogin } from './tipos/respuesta-login';
import { NOMBRE_COOKIE_ACCESO } from './constantes/cookie-auth';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly permisos: PermisosService,
  ) {}

  /**
   * POST /auth/login
   * Unica ruta publica del modulo. Maximo 5 intentos por minuto por IP.
   * Emite la sesion en cookie httpOnly (el JWT no viaja en el body).
   */
  @Publico()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesion (cookie httpOnly)' })
  async login(
    @Body() datos: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RespuestaLogin> {
    const resultado = await this.auth.login(datos);

    res.cookie(
      NOMBRE_COOKIE_ACCESO,
      resultado.accessToken,
      this.auth.opcionesParaSetCookie(),
    );

    return {
      expiraEn: resultado.expiraEn,
      usuario: resultado.usuario,
    };
  }

  /**
   * POST /auth/logout
   * Limpia la cookie de sesion. Publica para que el cliente pueda cerrar
   * sesion aunque el JWT ya este vencido.
   */
  @Publico()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Cerrar sesion (borra cookie)' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(NOMBRE_COOKIE_ACCESO, this.auth.opcionesParaClearCookie());
    return { ok: true };
  }

  /**
   * GET /auth/perfil
   * Ruta protegida: el frontend confirma que la sesion sigue viva y sirve para
   * probar el criterio "no se puede acceder a rutas privadas sin sesion".
   */
  @Get('perfil')
  @ApiCookieAuth('cookie')
  perfil(@UsuarioActual() usuario: UsuarioAutenticado) {
    return usuario;
  }

  @Patch('perfil')
  @ApiCookieAuth('cookie')
  @ApiOperation({
    summary: 'Actualizar el nombre y el correo de la sesión actual',
  })
  async actualizarPerfil(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: ActualizarPerfilDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resultado = await this.auth.actualizarPerfil(usuario, dto);

    res.cookie(
      NOMBRE_COOKIE_ACCESO,
      resultado.accessToken,
      this.auth.opcionesParaSetCookie(),
    );

    return resultado.usuario;
  }

  @Patch('perfil/contrasena')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('cookie')
  @ApiOperation({ summary: 'Cambiar la contraseña de la sesión actual' })
  cambiarContrasena(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CambiarContrasenaDto,
  ) {
    return this.auth.cambiarContrasena(usuario, dto);
  }

  /**
   * GET /auth/permisos
   *
   * Backlog 1.6: devuelve la matriz de permisos del rol de la sesion actual.
   * El frontend la usa para ocultar las opciones del menu y mostrar el aviso de
   * acceso denegado; el backend aplica la misma matriz en PermisosGuard, asi
   * que ocultar la opcion es una ayuda visual, no el control de seguridad.
   */
  @Get('permisos')
  @ApiCookieAuth('cookie')
  @ApiOperation({ summary: 'Permisos del rol de la sesion actual' })
  async permisosDeLaSesion(@UsuarioActual() usuario: UsuarioAutenticado) {
    return {
      rol: usuario.rol,
      permisos: await this.permisos.matrizDe(usuario.rol),
    };
  }
}
