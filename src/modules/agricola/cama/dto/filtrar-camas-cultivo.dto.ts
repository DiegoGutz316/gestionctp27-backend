import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  return typeof valor === 'string' ? valor.trim() : valor;
}

function transformarNumero({ value }: TransformFnParams): unknown {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || value.trim() === '') return undefined;

  return Number(value);
}

export class FiltrarCamasCultivoDto {
  /**
   * Busca camas por código o estado en una sola búsqueda, igual que
   * FiltrarAnimalesDto.q busca en código, nombre o estado.
   */
  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 120,
    description: 'Busca en código o estado',
  })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString({ message: 'Ingrese un texto de búsqueda' })
  @MinLength(1, { message: 'Ingrese un texto de búsqueda' })
  @MaxLength(120, { message: 'La búsqueda no puede superar 120 caracteres' })
  q?: string;

  @ApiPropertyOptional({
    example: 'Invernadero 1',
    minLength: 1,
    maxLength: 120,
    description: 'Ubicación exacta de la cama, por ejemplo Invernadero 1 o 2',
  })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString({ message: 'Seleccione una ubicación válida' })
  @MinLength(1, { message: 'Seleccione una ubicación válida' })
  @MaxLength(120, { message: 'La ubicación no puede superar 120 caracteres' })
  ubicacion?: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    example: 1,
    description: 'Id de la cama de cultivo',
  })
  @Transform(transformarNumero)
  @IsOptional()
  @IsPositive({ message: 'Seleccione una cama de cultivo válida' })
  @IsInt({ message: 'Seleccione una cama de cultivo válida' })
  camaId?: number;
}
