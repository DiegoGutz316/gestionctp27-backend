import { Transform, type TransformFnParams } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  return typeof valor === 'string' ? valor.trim() : valor;
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
}
