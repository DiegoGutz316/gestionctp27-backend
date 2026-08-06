import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
// import { ApiBearerAuth } from '@nestjs/swagger';

//import { Roles } from '../../auth/decorators/roles.decorator';
import { CrearUsuarioDto } from '../dto/crear-usuario.dto';
import { EditarUsuarioDto } from '../dto/editar-usuario.dto';
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

  /**
   * GET /usuarios/:id
   */
  @Get(':id')
  @Publico()
  //@Roles(RolUsuario.ADMINISTRADOR)
  obtenerPorId(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuariosService.obtenerPorId(id);
  }

  /**
   * PATCH /usuarios/:id
   */
  @Patch(':id')
  @Publico()
  //@Roles(RolUsuario.ADMINISTRADOR)
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: EditarUsuarioDto,
  ) {
    return this.usuariosService.actualizar(id, datos);
  }
}
