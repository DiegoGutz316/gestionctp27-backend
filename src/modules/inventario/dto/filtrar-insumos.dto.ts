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
import { transformarNumero } from './transformar-numero';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  return typeof valor === 'string' ? valor.trim() : valor;
}

export class FiltrarInsumosDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 120 })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString({ message: 'Ingrese un texto de búsqueda' })
  @MinLength(1, { message: 'Ingrese un texto de búsqueda' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres' })
  nombre?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @Transform(transformarNumero)
  @IsOptional()
  @IsInt({ message: 'Categoría inválida' })
  @IsPositive({ message: 'Categoría inválida' })
  categoriaId?: number;
}
