import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsuarioActual } from '../../auth/decorators/usuario-actual.decorator';
import { RequierePermiso } from '../../auth/decorators/requiere-permiso.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { AsientoService } from './asiento.service';
import { CrearAsientoDto } from './dto/crear-asiento.dto';
import { IdempotencyKeyPipe } from './pipes/idempotency-key.pipe';

@ApiTags('Libro de caja - Asientos')
@ApiCookieAuth('cookie')
@Controller('libro-caja/periodos/:periodoId/fondos/:fondoId/asientos')
@RequierePermiso(ModuloSistema.LIBRO_CAJA, NivelPermiso.COMPLETO)
export class AsientoController {
  constructor(private readonly asientoService: AsientoService) {}

  @Get()
  @RequierePermiso(ModuloSistema.LIBRO_CAJA, NivelPermiso.LECTURA)
  @ApiOperation({
    summary:
      'Listar asientos de ingresos y egresos de un departamento en un periodo',
  })
  listar(
    @Param('periodoId', ParseIntPipe) periodoId: number,
    @Param('fondoId', ParseIntPipe) fondoId: number,
  ) {
    return this.asientoService.listar(periodoId, fondoId);
  }

  @Post()
  @ApiOperation({
    summary: 'Registrar un asiento de ingreso o egreso en el libro de caja',
  })
  crear(
    @Param('periodoId', ParseIntPipe) periodoId: number,
    @Param('fondoId', ParseIntPipe) fondoId: number,
    @Body() dto: CrearAsientoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
    @Headers('idempotency-key') claveRecibida: string,
  ) {
    const clave = new IdempotencyKeyPipe().transform(claveRecibida);
    return this.asientoService.crear(periodoId, fondoId, dto, actor, clave);
  }

  @Patch(':asientoId')
  @ApiOperation({ summary: 'Corregir un asiento de un periodo abierto' })
  actualizar(
    @Param('periodoId', ParseIntPipe) periodoId: number,
    @Param('fondoId', ParseIntPipe) fondoId: number,
    @Param('asientoId', ParseIntPipe) asientoId: number,
    @Body() dto: CrearAsientoDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.asientoService.actualizar(
      periodoId,
      fondoId,
      asientoId,
      dto,
      actor,
    );
  }

  @Delete(':asientoId')
  @ApiOperation({ summary: 'Anular un asiento de un periodo abierto' })
  eliminar(
    @Param('periodoId', ParseIntPipe) periodoId: number,
    @Param('fondoId', ParseIntPipe) fondoId: number,
    @Param('asientoId', ParseIntPipe) asientoId: number,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.asientoService.eliminar(periodoId, fondoId, asientoId, actor);
  }
}
