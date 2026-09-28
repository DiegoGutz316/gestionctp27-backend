import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { TipoTratamiento } from '../enums/tipo-tratamiento.enum';

function normalizarTexto({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;

  const texto = value.trim();

  return texto === '' ? undefined : texto;
}

function transformarNumero({ value }: TransformFnParams): unknown {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || value.trim() === '') return undefined;

  return Number(value);
}

/**
 * Los filtros son opcionales y se combinan. El cultivo no se guarda en el
 * tratamiento: se busca en la siembra activa de la cama.
 */
export class ConsultarTratamientosDto {
  @ApiPropertyOptional({
    example: 'Tomate',
    description:
      'Coincidencia parcial e insensible a mayúsculas sobre el cultivo de la siembra activa',
  })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString({ message: 'Ingrese un cultivo válido' })
  @MinLength(1, { message: 'Ingrese un cultivo válido' })
  @MaxLength(120, { message: 'El cultivo no puede superar 120 caracteres' })
  cultivo?: string;

  @ApiPropertyOptional({
    example: 'Invernadero 1',
    maxLength: 120,
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
  })
  @Transform(transformarNumero)
  @IsOptional()
  @IsPositive({ message: 'Seleccione una cama de cultivo válida' })
  @IsInt({ message: 'Seleccione una cama de cultivo válida' })
  camaId?: number;

  @ApiPropertyOptional({
    enum: TipoTratamiento,
    enumName: 'TipoTratamiento',
    example: TipoTratamiento.FERTILIZANTE,
  })
  @IsOptional()
  @IsEnum(TipoTratamiento, {
    message: 'Seleccione un tipo de tratamiento válido',
  })
  tipo?: TipoTratamiento;
}
