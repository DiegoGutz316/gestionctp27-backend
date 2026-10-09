import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseInterceptors,
  type ArgumentsHost,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { MulterError } from 'multer';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Publico } from '../auth/decorators/publico.decorator';
import { RequierePermiso } from '../auth/decorators/requiere-permiso.decorator';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { ModuloSistema } from '../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../auth/enums/nivel-permiso.enum';
import { PermisosService } from '../auth/permisos.service';
import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';

import { AvisoService, type ArchivoFlyer } from './aviso.service';
import { ConsultarAvisosDto } from './dto/consultar-avisos.dto';
import { EditarAvisoDto } from './dto/editar-aviso.dto';
import { RegistrarAvisoDto } from './dto/registrar-aviso.dto';

@Catch(MulterError)
class ErrorDeFlyerFilter implements ExceptionFilter {
  catch(error: MulterError, host: ArgumentsHost): void {
    const respuesta = host.switchToHttp().getResponse<Response>();
    respuesta.status(400).json({
      statusCode: 400,
      message:
        error.code === 'LIMIT_FILE_SIZE'
          ? 'El flyer no puede superar 5 MB.'
          : 'No se pudo recibir el flyer.',
    });
  }
}

/**
 * Backlog 5.5 (Crear avisos institucionales).
 *
 * Los avisos son la mitad de "comunicacion" del Feature 5, asi que el permiso
 * que los gobierna es REPORTES: el enum de modulos sigue las Features del
 * documento, y esta es "Reportes y comunicacion institucional".
 */
@ApiTags('Comunicación - Avisos institucionales')
@ApiCookieAuth('cookie')
@Controller('comunicacion/avisos')
@RequierePermiso(ModuloSistema.REPORTES, NivelPermiso.COMPLETO)
export class AvisoController {
  constructor(
    private readonly avisoService: AvisoService,
    private readonly permisos: PermisosService,
  ) {}

  @ApiOperation({
    summary: 'Consultar los avisos institucionales',
    description:
      'La lectura recibe solo activos. Con permiso completo se puede filtrar por estado y buscar por título.',
  })
  @Get()
  @RequierePermiso(ModuloSistema.REPORTES, NivelPermiso.LECTURA)
  async consultar(
    @Query() filtros: ConsultarAvisosDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    const puedeAdministrar = await this.permisos.puede(
      actor.rol,
      ModuloSistema.REPORTES,
      NivelPermiso.COMPLETO,
    );
    return this.avisoService.consultar(filtros, puedeAdministrar);
  }

  @ApiOperation({
    summary: 'Avisos activos para la página pública',
    description:
      'No requiere sesión. Solo devuelve título, descripción y fecha de los avisos activos.',
  })
  @Publico()
  @Get('publicos')
  consultarPublicos(@Query() filtros: ConsultarAvisosDto) {
    return this.avisoService.consultarPublicos(filtros);
  }

  @ApiOperation({ summary: 'Publicar un aviso institucional' })
  @Post()
  registrar(
    @Body() dto: RegistrarAvisoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.avisoService.registrar(dto, actor);
  }

  /**
   * La ruta de desactivar va antes de `PATCH :id` para que Nest no la tome
   * como un id.
   */
  @ApiOperation({
    summary: 'Desactivar un aviso institucional',
    description:
      'Cambia el estado a INACTIVO. El aviso no se elimina de la base de datos.',
  })
  @Patch(':id/desactivar')
  desactivar(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.avisoService.desactivar(id, actor);
  }

  @ApiOperation({ summary: 'Consultar un aviso institucional por id' })
  @ApiOperation({
    summary: 'Flyer de un aviso activo',
    description:
      'No requiere sesión. Responde 404 si el aviso está inactivo o no tiene imagen.',
  })
  @Publico()
  @Get(':id/flyer')
  async flyer(@Param('id', ParseIntPipe) id: number): Promise<StreamableFile> {
    const archivo = await this.avisoService.obtenerFlyer(id);

    return new StreamableFile(archivo.contenido, {
      type: archivo.tipo,
      disposition: 'inline',
    });
  }

  @ApiOperation({ summary: 'Subir o reemplazar el flyer de un aviso' })
  @Put(':id/flyer')
  @UseFilters(ErrorDeFlyerFilter)
  @UseInterceptors(
    FileInterceptor('flyer', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  guardarFlyer(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() archivo: ArchivoFlyer | undefined,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.avisoService.guardarFlyer(id, archivo, actor);
  }

  @ApiOperation({ summary: 'Quitar el flyer de un aviso' })
  @Delete(':id/flyer')
  quitarFlyer(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.avisoService.quitarFlyer(id, actor);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.avisoService.obtener(id);
  }

  @ApiOperation({
    summary: 'Editar un aviso institucional',
    description: 'Actualiza título, descripción, fecha y estado.',
  })
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditarAvisoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.avisoService.actualizar(id, dto, actor);
  }
}
