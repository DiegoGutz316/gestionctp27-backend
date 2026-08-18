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
import { ApiCookieAuth, ApiOperation } from '@nestjs/swagger';

import { RequierePermiso } from '../auth/decorators/requiere-permiso.decorator';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { ModuloSistema } from '../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../auth/enums/nivel-permiso.enum';
import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { EditarUsuarioDto } from './dto/editar-usuario.dto';
import { PaginarUsuariosDto } from './dto/paginar-usuarios.dto';
import { UsuariosService } from './usuarios.service';

/**
 * Backlog 1.6: el modulo completo exige permiso sobre USUARIOS, que en la
 * matriz sembrada solo tiene el rol ADMINISTRADOR. Antes de este backlog los
 * endpoints estaban marcados @Publico() y cualquiera podia crear usuarios o
 * cambiar roles sin sesion.
 *
 * El permiso se afina por metodo: consultar exige LECTURA, y crear/editar/
 * desactivar exigen COMPLETO.
 */
@Controller('usuarios')
@ApiCookieAuth('cookie')
@RequierePermiso(ModuloSistema.USUARIOS, NivelPermiso.COMPLETO)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  /**
   * POST /usuarios
   *
   * Solo un usuario con permiso COMPLETO sobre USUARIOS (rol ADMINISTRADOR)
   * puede registrar usuarios. El identificador del administrador se obtiene del
   * JWT y se almacena en creadoPor.
   */
  @Post()
  @ApiOperation({ summary: 'Registrar un usuario' })
  crear(
    @Body() datos: CrearUsuarioDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.usuariosService.crear(datos, actor);
  }

  /**
   * GET /usuarios
   * Query: pagina, limite, q, rol, activo, order
   */
  @Get()
  @RequierePermiso(ModuloSistema.USUARIOS, NivelPermiso.LECTURA)
  @ApiOperation({ summary: 'Listar usuarios (paginado)' })
  listar(@Query() filtros: PaginarUsuariosDto) {
    return this.usuariosService.listar(filtros);
  }

  /**
   * GET /usuarios/:id
   */
  @Get(':id')
  @RequierePermiso(ModuloSistema.USUARIOS, NivelPermiso.LECTURA)
  @ApiOperation({ summary: 'Consultar un usuario por id' })
  obtenerPorId(@Param('id', ParseUUIDPipe) id: string) {
    return this.usuariosService.obtenerPorId(id);
  }

  /**
   * PATCH /usuarios/:id/desactivar
   *
   * Desactivación lógica (activo → false). El registro se conserva.
   */
  @Patch(':id/desactivar')
  @ApiOperation({ summary: 'Desactivar un usuario (eliminación lógica)' })
  desactivar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.usuariosService.desactivar(id, actor);
  }

  /**
   * PATCH /usuarios/:id
   *
   * Incluye la asignación de rol (Backlog 1.6). El servicio valida que el
   * administrador no se quite a sí mismo el acceso.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Editar un usuario (incluye su rol)' })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() datos: EditarUsuarioDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.usuariosService.actualizar(id, datos, actor);
  }
}
