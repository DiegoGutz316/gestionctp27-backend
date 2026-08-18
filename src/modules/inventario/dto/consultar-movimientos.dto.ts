import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { PaginarDto } from '../../../common/paginacion/dto/paginar.dto';
import { TipoMovimiento } from '../enums/tipo-movimiento.enum';
import { transformarNumero } from './transformar-numero';

/**
 * Filtros del historial de movimientos (backlogs 4.5 y 4.6).
 *
 * Hereda `pagina` y `limite` de PaginarDto (el historial crece con cada
 * movimiento y no se depura nunca), pero **omite `q`**: este listado no admite
 * búsqueda por texto libre, se filtra por tipo, insumo concreto y fechas. Se
 * omite en lugar de ignorarlo para que el contrato no anuncie un parámetro
 * inoperante.
 */
export class ConsultarMovimientosDto extends OmitType(PaginarDto, [
  'q',
] as const) {
  @ApiPropertyOptional({
    enum: TipoMovimiento,
    enumName: 'TipoMovimiento',
    description: 'Sin este filtro se devuelven entradas y salidas',
  })
  @IsOptional()
  @IsEnum(TipoMovimiento, { message: 'Tipo de movimiento inválido' })
  tipo?: TipoMovimiento;

  @ApiPropertyOptional({ type: Number, minimum: 1, description: 'Id del insumo' })
  @Transform(transformarNumero)
  @IsOptional()
  @IsInt({ message: 'Insumo inválido' })
  @IsPositive({ message: 'Insumo inválido' })
  insumoId?: number;

  @ApiPropertyOptional({
    example: '2026-08-01',
    description: 'Incluye los movimientos de esta fecha en adelante',
  })
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'Ingrese una fecha de inicio válida (AAAA-MM-DD)' },
  )
  desde?: string;

  @ApiPropertyOptional({
    example: '2026-08-31',
    description: 'Incluye los movimientos hasta esta fecha',
  })
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'Ingrese una fecha de fin válida (AAAA-MM-DD)' },
  )
  hasta?: string;
}
