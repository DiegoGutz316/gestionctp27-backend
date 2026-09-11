import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { EsFechaNoFutura } from '../../../common/validacion/fecha-no-futura.validator';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;

  return typeof valor === 'string' ? valor.trim() : valor;
}

export class CrearDesparasitacionDto {
  @ApiProperty({
    example: 1,
    description: 'Identificador del animal desparasitado',
  })
  @IsInt({ message: 'Seleccione un animal' })
  @IsPositive({ message: 'Seleccione un animal' })
  animalId!: number;

  /**
   * Ojo con el orden de los decoradores: class-validator devuelve los errores
   * en orden inverso al de declaracion y el frontend muestra el primero. Por
   * eso el mensaje de "obligatorio" se declara al final, para que sea el que
   * vea el usuario cuando el campo llega vacio. Al reves, un campo sin
   * completar se queja de la longitud maxima, que no es lo que pasa.
   */
  @ApiProperty({
    minLength: 1,
    maxLength: 120,
    example: 'Ivermectina 1%',
  })
  @Transform(normalizarTexto)
  @MaxLength(120, {
    message: 'El producto no puede superar 120 caracteres',
  })
  @IsNotEmpty({ message: 'El producto aplicado es obligatorio' })
  @IsString({ message: 'El producto aplicado es obligatorio' })
  producto!: string;

  @ApiProperty({
    example: '2026-09-10',
    description: 'Fecha de aplicación; no puede ser futura',
  })
  @EsFechaNoFutura({
    message: 'Ingrese una fecha válida que no sea futura',
  })
  @IsNotEmpty({ message: 'La fecha es obligatoria' })
  fecha!: string;

  @ApiPropertyOptional({
    maxLength: 500,
    example: 'Segunda dosis del ciclo.',
  })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  @MaxLength(500, {
    message: 'Las observaciones no pueden superar 500 caracteres',
  })
  observaciones?: string;
}
