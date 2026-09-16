import { Transform, type TransformFnParams } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { EsFechaNoFutura } from '../../../../common/validacion/fecha-no-futura.validator';

function normalizarTexto({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;
  const texto = value.trim();
  return texto === '' ? undefined : texto;
}

export class ConsultarSiembrasDto {
  @ApiPropertyOptional({
    example: 'Tomate',
    description: 'Coincidencia parcial e insensible a mayúsculas',
  })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString({ message: 'Ingrese un cultivo válido' })
  @MinLength(1, { message: 'Ingrese un cultivo válido' })
  @MaxLength(120, { message: 'El filtro no puede superar 120 caracteres' })
  cultivo?: string;

  @ApiPropertyOptional({ example: '2026-09-15' })
  @Transform(normalizarTexto)
  @IsOptional()
  @EsFechaNoFutura({ message: 'Ingrese una fecha válida que no sea futura' })
  fecha?: string;
}
