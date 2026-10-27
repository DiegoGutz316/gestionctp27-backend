import {
  Body,
  Catch,
  Controller,
  Delete,
  ExceptionFilter,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseInterceptors,
  type ArgumentsHost,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { MulterError } from 'multer';

import { Publico } from '../auth/decorators/publico.decorator';
import { RequierePermiso } from '../auth/decorators/requiere-permiso.decorator';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { ModuloSistema } from '../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../auth/enums/nivel-permiso.enum';
import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';
import { CrearEspecialidadDto } from './dto/crear-especialidad.dto';
import { EditarEspecialidadDto } from './dto/editar-especialidad.dto';
import {
  EspecialidadService,
  type ArchivoFoto,
} from './especialidad.service';

@Catch(MulterError)
class ErrorDeFotoFilter implements ExceptionFilter {
  catch(error: MulterError, host: ArgumentsHost): void {
    const respuesta = host.switchToHttp().getResponse<Response>();
    respuesta.status(400).json({
      statusCode: 400,
      message:
        error.code === 'LIMIT_FILE_SIZE'
          ? 'La foto no puede superar 5 MB.'
          : 'No se pudo recibir la foto.',
    });
  }
}

@ApiTags('Landing - Especialidades')
@Controller('landing/especialidades')
export class EspecialidadController {
  constructor(private readonly servicio: EspecialidadService) {}

  @ApiOperation({ summary: 'Especialidades activas para la landing pública' })
  @Publico()
  @SkipThrottle()
  @Get('publicas')
  listarPublicas() {
    return this.servicio.listarPublicas();
  }

  @ApiOperation({ summary: 'Foto de una especialidad activa (pública)' })
  @Publico()
  @SkipThrottle()
  @Get(':id/foto')
  async fotoPublica(@Param('id', ParseIntPipe) id: number) {
    const archivo = await this.servicio.obtenerFoto(id);
    return new StreamableFile(archivo.contenido, {
      type: archivo.tipo,
      disposition: 'inline',
    });
  }

  @ApiCookieAuth('cookie')
  @ApiOperation({ summary: 'Listar especialidades (gestión)' })
  @Get()
  @RequierePermiso(ModuloSistema.REPORTES, NivelPermiso.COMPLETO)
  listarGestion() {
    return this.servicio.listarGestion();
  }

  @ApiCookieAuth('cookie')
  @ApiOperation({ summary: 'Obtener una especialidad' })
  @Get(':id')
  @RequierePermiso(ModuloSistema.REPORTES, NivelPermiso.COMPLETO)
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.obtener(id);
  }

  @ApiCookieAuth('cookie')
  @ApiOperation({ summary: 'Foto de gestión (incluye inactivas)' })
  @Get(':id/foto/gestion')
  @RequierePermiso(ModuloSistema.REPORTES, NivelPermiso.COMPLETO)
  async fotoGestion(@Param('id', ParseIntPipe) id: number) {
    const archivo = await this.servicio.obtenerFoto(id, {
      incluirInactivas: true,
    });
    return new StreamableFile(archivo.contenido, {
      type: archivo.tipo,
      disposition: 'inline',
    });
  }

  @ApiCookieAuth('cookie')
  @ApiOperation({ summary: 'Registrar especialidad' })
  @Post()
  @RequierePermiso(ModuloSistema.REPORTES, NivelPermiso.COMPLETO)
  crear(
    @Body() dto: CrearEspecialidadDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.servicio.crear(dto, actor);
  }

  @ApiCookieAuth('cookie')
  @ApiOperation({ summary: 'Editar especialidad' })
  @Patch(':id')
  @RequierePermiso(ModuloSistema.REPORTES, NivelPermiso.COMPLETO)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditarEspecialidadDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.servicio.actualizar(id, dto, actor);
  }

  @ApiCookieAuth('cookie')
  @ApiOperation({ summary: 'Desactivar especialidad' })
  @Delete(':id')
  @RequierePermiso(ModuloSistema.REPORTES, NivelPermiso.COMPLETO)
  desactivar(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.servicio.desactivar(id, actor);
  }

  @ApiCookieAuth('cookie')
  @ApiOperation({ summary: 'Reactivar especialidad' })
  @Post(':id/reactivar')
  @RequierePermiso(ModuloSistema.REPORTES, NivelPermiso.COMPLETO)
  reactivar(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.servicio.reactivar(id, actor);
  }

  @ApiCookieAuth('cookie')
  @ApiOperation({ summary: 'Subir o reemplazar foto' })
  @Put(':id/foto')
  @RequierePermiso(ModuloSistema.REPORTES, NivelPermiso.COMPLETO)
  @UseFilters(ErrorDeFotoFilter)
  @UseInterceptors(
    FileInterceptor('foto', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  guardarFoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() archivo: ArchivoFoto | undefined,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.servicio.guardarFoto(id, archivo, actor);
  }

  @ApiCookieAuth('cookie')
  @ApiOperation({ summary: 'Quitar foto subida (vuelve al respaldo estático)' })
  @Delete(':id/foto')
  @RequierePermiso(ModuloSistema.REPORTES, NivelPermiso.COMPLETO)
  quitarFoto(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.servicio.quitarFoto(id, actor);
  }
}
