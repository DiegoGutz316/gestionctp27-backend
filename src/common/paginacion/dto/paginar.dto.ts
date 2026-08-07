import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Query params compartidos para listados paginados.
 * Los endpoints concretos pueden extender esta clase (p. ej. filtros + pagina/limite).
 */
export class PaginarDto {
  @ApiPropertyOptional({
    minimum: 1,
    default: 1,
    description: 'Número de página (desde 1)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero' })
  @Min(1, { message: 'La página debe ser al menos 1' })
  pagina: number = 1;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 10,
    description: 'Cantidad de registros por página',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite debe ser al menos 1' })
  @Max(100, { message: 'El límite no puede superar 100' })
  limite: number = 10;

  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 150,
    description: 'Texto libre para búsqueda',
  })
  @IsOptional()
  @IsString({ message: 'Ingrese un texto de búsqueda' })
  @MinLength(1, { message: 'Ingrese un texto de búsqueda' })
  @MaxLength(150, { message: 'La búsqueda no puede superar 150 caracteres' })
  q?: string;
}
