import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsPositive } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { transformarNumero } from './transformar-numero';

export class FiltrarInventarioDto {
  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @Transform(transformarNumero)
  @IsOptional()
  @IsInt({ message: 'Producto inválido' })
  @IsPositive({ message: 'Producto inválido' })
  productoId?: number;
}
