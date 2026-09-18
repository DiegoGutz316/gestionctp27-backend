import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { EsFechaNoFutura } from '../../../../common/validacion/fecha-no-futura.validator';
import { TieneMaximoDosDecimales } from '../../siembra/dto/dos-decimales.validator';

/** Limite de la columna numeric(12,2). */
const CANTIDAD_MAXIMA = 9_999_999_999.99;

function transformarNumero({ value }: TransformFnParams): unknown {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || value.trim() === '') return value;

  return Number(value);
}

function normalizarObservaciones({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;

  const texto = value.trim();

  return texto === '' ? undefined : texto;
}

export class RegistrarCosechaDto {
  @ApiProperty({ type: Number, minimum: 1, example: 1 })
  @Transform(transformarNumero)
  @IsDefined({ message: 'Seleccione una siembra' })
  @IsInt({ message: 'Seleccione una siembra válida' })
  @IsPositive({ message: 'Seleccione una siembra válida' })
  siembraId!: number;

  @ApiProperty({ example: '2026-09-17', description: 'Fecha AAAA-MM-DD' })
  @IsDefined({ message: 'La fecha de cosecha es obligatoria' })
  @EsFechaNoFutura({
    message: 'Ingrese una fecha de cosecha válida que no sea futura',
  })
  fecha!: string;

  /**
   * Los decimales se validan con `TieneMaximoDosDecimales` y no con
   * `@IsNumber({ maxDecimalPlaces })`, que lanza una excepcion con la notacion
   * exponencial y devuelve 500 en vez de 400.
   */
  @ApiProperty({
    type: Number,
    minimum: 0,
    exclusiveMinimum: true,
    example: 12.5,
  })
  // Ojo con el orden: class-validator devuelve los errores en orden inverso al
  // de los decoradores y el frontend muestra el primero. Con el orden natural,
  // un texto como "abc" se quejaba de superar el maximo en vez de no ser un
  // numero. Por eso el mensaje mas basico se declara al final.
  @Transform(transformarNumero)
  @Max(CANTIDAD_MAXIMA, {
    message: 'La cantidad obtenida supera el máximo permitido',
  })
  @IsPositive({ message: 'La cantidad obtenida debe ser mayor a cero' })
  @TieneMaximoDosDecimales({
    message: 'La cantidad obtenida admite como máximo 2 decimales',
  })
  @IsNumber({}, { message: 'La cantidad obtenida debe ser un número válido' })
  @IsDefined({ message: 'La cantidad obtenida es obligatoria' })
  cantidadObtenida!: number;

  @ApiPropertyOptional({
    maxLength: 500,
    example: 'Cosecha de primera calidad, sin plagas.',
  })
  @Transform(normalizarObservaciones)
  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  @MaxLength(500, {
    message: 'Las observaciones no pueden superar 500 caracteres',
  })
  observaciones?: string;
}
