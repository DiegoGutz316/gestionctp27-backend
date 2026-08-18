import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { PaginarDto } from '../../../../common/paginacion/dto/paginar.dto';
import { transformarNumero } from './transformar-numero';
import {
  EsFechaInventario,
  RangoFechasValido,
} from './fecha-inventario.validator';
import { TipoMovimiento } from '../enums/tipo-movimiento.enum';

/**
 * Filtros del historial de movimientos. Hereda `pagina`/`limite` de
 * `PaginarDto` pero omite `q`: este listado no admite búsqueda por texto
 * libre, se filtra por registro de inventario y por fechas.
 */
@RangoFechasValido()
export class ConsultarMovimientosDto extends OmitType(PaginarDto, [
  'q',
] as const) {
  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    description: 'Id del registro de inventario',
  })
  @Transform(transformarNumero)
  @IsOptional()
  @IsInt({ message: 'Registro de inventario inválido' })
  @IsPositive({ message: 'Registro de inventario inválido' })
  inventarioId?: number;

  @ApiPropertyOptional({
    example: '2026-08-01',
    description: 'Incluye los movimientos de esta fecha en adelante',
  })
  @IsOptional()
  @EsFechaInventario()
  desde?: string;

  @ApiPropertyOptional({
    example: '2026-08-31',
    description: 'Incluye los movimientos hasta esta fecha',
  })
  @IsOptional()
  @EsFechaInventario()
  hasta?: string;

  @ApiPropertyOptional({ enum: TipoMovimiento, enumName: 'TipoMovimiento' })
  @IsOptional()
  @IsEnum(TipoMovimiento, { message: 'Tipo de movimiento inválido' })
  tipo?: TipoMovimiento;
}
