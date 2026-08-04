import { Body, Controller, Post } from '@nestjs/common';
import { CrearUsuarioDto } from '../dto/crear-usuario.dto';
import { UsuariosService } from '../services/usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  crear(@Body() crearUsuarioDto: CrearUsuarioDto) {
    return this.usuariosService.crear(crearUsuarioDto, null);
  }
}
