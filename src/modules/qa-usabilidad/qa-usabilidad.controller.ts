import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../auth/tipos/jwt-payload';
import { RolUsuario } from '../usuarios/enums/rol-usuario.enum';
import { ActualizarSesionDto } from './dto/actualizar-sesion.dto';
import { CrearParticipanteDto } from './dto/crear-participante.dto';
import { CrearSesionDto } from './dto/crear-sesion.dto';
import { QaUsabilidadHabilitadoGuard } from './guards/qa-usabilidad-habilitado.guard';
import { QaUsabilidadService } from './qa-usabilidad.service';

/**
 * Panel de evaluación de usabilidad (solo QA + ADMINISTRADOR).
 * No forma parte de la operación diaria del colegio.
 */
@ApiTags('QA — Usabilidad')
@ApiCookieAuth('cookie')
@Controller('qa/usabilidad')
@UseGuards(QaUsabilidadHabilitadoGuard)
@Roles(RolUsuario.ADMINISTRADOR)
export class QaUsabilidadController {
  constructor(private readonly servicio: QaUsabilidadService) {}

  @ApiOperation({ summary: 'Catálogo USAB-01…10 y metadato del piloto técnico' })
  @Get('catalogo')
  catalogo() {
    return this.servicio.catalogo();
  }

  @ApiOperation({ summary: 'Resumen del panel (sesiones reales vs piloto)' })
  @Get('resumen')
  resumen() {
    return this.servicio.resumen();
  }

  @Get('participantes')
  listarParticipantes() {
    return this.servicio.listarParticipantes();
  }

  @Post('participantes')
  crearParticipante(
    @Body() dto: CrearParticipanteDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.servicio.crearParticipante(dto, actor);
  }

  @Get('sesiones')
  listarSesiones() {
    return this.servicio.listarSesiones();
  }

  @Get('sesiones/:id')
  obtenerSesion(@Param('id', ParseIntPipe) id: number) {
    return this.servicio.obtenerSesion(id);
  }

  @Post('sesiones')
  crearSesion(
    @Body() dto: CrearSesionDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.servicio.crearSesion(dto, actor);
  }

  @Patch('sesiones/:id')
  actualizarSesion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarSesionDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.servicio.actualizarSesion(id, dto, actor);
  }

  @Post('sesiones/:id/finalizar')
  finalizar(
    @Param('id', ParseIntPipe) id: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.servicio.finalizarSesion(id, actor);
  }

  @Post('sesiones/:id/evidencias')
  @UseInterceptors(
    FileInterceptor('archivo', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  adjuntar(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile()
    archivo:
      | { originalname: string; mimetype: string; size: number; buffer: Buffer }
      | undefined,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    if (!archivo) {
      throw new BadRequestException('Adjunte un archivo en el campo "archivo".');
    }
    return this.servicio.adjuntarEvidencia(id, archivo, actor);
  }

  @Get('evidencias/:id/archivo')
  async descargar(@Param('id', ParseIntPipe) id: number) {
    const ev = await this.servicio.descargarEvidencia(id);
    return new StreamableFile(ev.contenido, {
      type: ev.mime,
      disposition: `inline; filename="${ev.nombreArchivo}"`,
    });
  }

  @Get('informe.md')
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="informe-usabilidad-ctp27.md"',
  )
  async informe() {
    const md = await this.servicio.generarInformeMarkdown();
    return md;
  }
}
