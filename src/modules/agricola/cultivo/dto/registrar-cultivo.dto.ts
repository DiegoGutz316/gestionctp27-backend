import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { TipoCultivo } from '../enums/tipo-cultivo.enum';

function normalizarTexto({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
}

function normalizarDescripcion({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;

  const texto = value.trim();

  return texto === '' ? undefined : texto;
}

export class RegistrarCultivoDto {
  @ApiProperty({ example: 'Lechuga', maxLength: 120 })
  @Transform(normalizarTexto)
  @MaxLength(120, {
    message: 'El nombre no puede superar 120 caracteres',
  })
  @MinLength(2, { message: 'El nombre del cultivo es obligatorio' })
  @IsString({ message: 'El nombre del cultivo es obligatorio' })
  @IsDefined({ message: 'El nombre del cultivo es obligatorio' })
  nombre!: string;

  @ApiProperty({
    enum: TipoCultivo,
    enumName: 'TipoCultivo',
    example: TipoCultivo.HORTALIZA,
  })
  @IsEnum(TipoCultivo, { message: 'Seleccione un tipo de cultivo válido' })
  @IsDefined({ message: 'Seleccione el tipo de cultivo' })
  tipo!: TipoCultivo;

  @ApiPropertyOptional({
    example: 'Variedad de hoja suelta, ciclo de 45 días.',
    maxLength: 500,
  })
  @Transform(normalizarDescripcion)
  @IsOptional()
  @MaxLength(500, {
    message: 'La descripción no puede superar 500 caracteres',
  })
  @IsString({ message: 'La descripción debe ser texto' })
  descripcion?: string;

  @ApiPropertyOptional({
    description: 'Un cultivo inactivo deja de ofrecerse al sembrar',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso' })
  activo?: boolean;
}
