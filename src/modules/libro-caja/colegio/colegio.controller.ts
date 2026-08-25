import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsuarioActual } from '../../auth/decorators/usuario-actual.decorator';
import { RequierePermiso } from '../../auth/decorators/requiere-permiso.decorator';
import { ModuloSistema } from '../../auth/enums/modulo-sistema.enum';
import { NivelPermiso } from '../../auth/enums/nivel-permiso.enum';
import type { UsuarioAutenticado } from '../../auth/tipos/jwt-payload';
import { ColegioService } from './colegio.service';
import { ActualizarInformacionColegioDto } from './dto/actualizar-informacion-colegio.dto';

@ApiTags('Libro de caja - Colegio')
@ApiCookieAuth('cookie')
@Controller('libro-caja/colegio')
@RequierePermiso(ModuloSistema.LIBRO_CAJA, NivelPermiso.COMPLETO)
export class ColegioController {
  constructor(private readonly colegioService: ColegioService) {}

  @Get()
  @RequierePermiso(ModuloSistema.LIBRO_CAJA, NivelPermiso.LECTURA)
  @ApiOperation({ summary: 'Consultar la información del colegio' })
  obtener() {
    return this.colegioService.obtener();
  }

  @Put()
  @ApiOperation({
    summary: 'Actualizar nombre, cuenta bancaria y entidad de depósito',
  })
  actualizar(
    @Body() dto: ActualizarInformacionColegioDto,
    @UsuarioActual() actor: UsuarioAutenticado,
  ) {
    return this.colegioService.actualizar(dto, actor);
  }
}
