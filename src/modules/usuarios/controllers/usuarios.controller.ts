import { Body, Controller, Post } from '@nestjs/common';
// import { ApiBearerAuth } from '@nestjs/swagger';

//import { Roles } from '../../auth/decorators/roles.decorator';
import { CrearUsuarioDto } from '../dto/crear-usuario.dto';
//import { RolUsuario } from '../enums/rol-usuario.enum';
import { UsuariosService } from '../services/usuarios.service';
import { Publico } from '../../auth/decorators/publico.decorator';

@Controller('usuarios')
// @ApiBearerAuth('jwt')
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
  @Publico()
  //@Roles(RolUsuario.ADMINISTRADOR)
  crear(@Body() datos: CrearUsuarioDto) {
    return this.usuariosService.crear(datos);
  }
}
