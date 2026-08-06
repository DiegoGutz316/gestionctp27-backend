import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth } from '@nestjs/swagger';

import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { Publico } from '../decorators/publico.decorator';
import { UsuarioActual } from '../decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../tipos/jwt-payload';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * POST /auth/login
   * Unica ruta publica del modulo. Maximo 5 intentos por minuto por IP.
   */
  @Publico()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() datos: LoginDto) {
    return this.auth.login(datos);
  }

  /**
   * GET /auth/perfil
   * Ruta protegida: el frontend confirma que la sesion sigue viva y sirve para
   * probar el criterio "no se puede acceder a rutas privadas sin sesion".
   */
  @Get('perfil')
  @ApiBearerAuth('jwt')
  perfil(@UsuarioActual() usuario: UsuarioAutenticado) {
    return usuario;
  }
}
