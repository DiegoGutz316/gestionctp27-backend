import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { EsFechaNoFutura } from '../../../../common/validacion/fecha-no-futura.validator';
import { TieneMaximoDosDecimales } from './dos-decimales.validator';
import { transformarNumero } from './transformar-numero';

const CANTIDAD_MAXIMA = 9_999_999_999.99;

function normalizarTexto({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class RegistrarSiembraDto {
  @ApiProperty({ type: Number, minimum: 1, example: 1 })
  @Transform(transformarNumero)
  @IsDefined({ message: 'Seleccione una cama de cultivo' })
  @IsInt({ message: 'Seleccione una cama de cultivo válida' })
  @IsPositive({ message: 'Seleccione una cama de cultivo válida' })
  camaId!: number;

  @ApiProperty({ example: 'Tomate', maxLength: 120 })
  @Transform(normalizarTexto)
  @IsDefined({ message: 'El tipo de cultivo es obligatorio' })
  @IsString({ message: 'El tipo de cultivo es obligatorio' })
  @MinLength(1, { message: 'El tipo de cultivo es obligatorio' })
  @MaxLength(120, {
    message: 'El tipo de cultivo no puede superar 120 caracteres',
  })
  tipoCultivo!: string;

  @ApiProperty({ example: '2026-09-15', description: 'Fecha AAAA-MM-DD' })
  @IsDefined({ message: 'La fecha de siembra es obligatoria' })
  @EsFechaNoFutura({
    message: 'Ingrese una fecha de siembra válida que no sea futura',
  })
  fechaSiembra!: string;

  @ApiProperty({
    type: Number,
    minimum: 0,
    exclusiveMinimum: true,
    example: 50,
  })
  @Transform(transformarNumero)
  @IsDefined({ message: 'La cantidad sembrada es obligatoria' })
  @IsNumber({}, { message: 'La cantidad sembrada debe ser un número válido' })
  @TieneMaximoDosDecimales({
    message: 'La cantidad sembrada admite como máximo 2 decimales',
  })
  @IsPositive({ message: 'La cantidad sembrada debe ser mayor a cero' })
  @Max(CANTIDAD_MAXIMA, {
    message: 'La cantidad sembrada supera el máximo permitido',
  })
  cantidadSembrada!: number;
}
