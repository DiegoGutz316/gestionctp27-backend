import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsPositive } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginarDto } from '../../../common/paginacion/dto/paginar.dto';
import { transformarNumero } from './transformar-numero';

/**
 * Backlog 4.5: filtros del historial de entradas.
 *
 * Hereda `pagina` y `limite` de PaginarDto (el historial crece con cada
 * movimiento y no se depura nunca). El campo `q` heredado no se usa aquí: en
 * este listado se filtra por insumo concreto, no por texto libre.
 */
export class ConsultarEntradasDto extends PaginarDto {
  @ApiPropertyOptional({ type: Number, minimum: 1, description: 'Id del insumo' })
  @Transform(transformarNumero)
  @IsOptional()
  @IsInt({ message: 'Insumo inválido' })
  @IsPositive({ message: 'Insumo inválido' })
  insumoId?: number;

  @ApiPropertyOptional({
    example: '2026-08-01',
    description: 'Incluye las entradas de esta fecha en adelante',
  })
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'Ingrese una fecha de inicio válida (AAAA-MM-DD)' },
  )
  desde?: string;

  @ApiPropertyOptional({
    example: '2026-08-31',
    description: 'Incluye las entradas hasta esta fecha',
  })
  @IsOptional()
  @IsDateString(
    { strict: true },
    { message: 'Ingrese una fecha de fin válida (AAAA-MM-DD)' },
  )
  hasta?: string;
}
