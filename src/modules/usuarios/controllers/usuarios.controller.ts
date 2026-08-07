import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { Roles } from '../../auth/decorators/roles.decorator';
import { ConsultarUsuariosDto } from '../dto/consultar-usuarios.dto';
import { CrearUsuarioDto } from '../dto/crear-usuario.dto';
import { RolUsuario } from '../enums/rol-usuario.enum';
import { UsuariosService } from '../services/usuarios.service';
import { Publico } from '../../auth/decorators/publico.decorator';

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
  @Publico()
  //@Roles(RolUsuario.ADMINISTRADOR)
  crear(@Body() datos: CrearUsuarioDto) {
    return this.usuariosService.crear(datos);
  }

  /**
   * GET /usuarios
   *
   * Backlog 1.3: solo ADMINISTRADOR puede consultar la lista de usuarios.
   */
  @Get()
  @ApiBearerAuth('jwt')
  @Roles(RolUsuario.ADMINISTRADOR)
  listar(@Query() filtros: ConsultarUsuariosDto) {
    return this.usuariosService.listar(filtros);
  }

  /**
   * PATCH /usuarios/:id/desactivar
   *
   * Backlog 1.5: solo ADMINISTRADOR puede desactivar usuarios. Baja logica
   * (activo=false), nunca DELETE.
   */
  @Patch(':id/desactivar')
  @ApiBearerAuth('jwt')
  @Roles(RolUsuario.ADMINISTRADOR)
  desactivar(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuariosService.desactivar(id);
  }
}
