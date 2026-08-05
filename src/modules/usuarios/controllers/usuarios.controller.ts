import { Body, Controller, Post } from '@nestjs/common';

import { Roles } from '../../auth/decorators/roles.decorator';
import { UsuarioActual } from '../../auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { CrearUsuarioDto } from '../dto/crear-usuario.dto';
import { UsuariosService } from '../services/usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  /**
   * POST /usuarios
   *
   * Solo un usuario con rol ADMINISTRADOR puede registrar usuarios.
   * El identificador del administrador se obtiene del JWT y se almacena
   * automáticamente en creadoPor.
   */
  @Post()
  @Roles('ADMINISTRADOR')
  crear(
    @Body() datos: CrearUsuarioDto,
    @UsuarioActual() administrador: UsuarioAutenticado,
  ) {
    return this.usuariosService.crear(datos, administrador.id);
  }
}
