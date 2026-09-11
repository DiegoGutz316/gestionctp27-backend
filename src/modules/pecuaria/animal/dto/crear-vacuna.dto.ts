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

import { EsFechaNoFutura } from '../../../../common/validacion/fecha-no-futura.validator';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;

  return typeof valor === 'string' ? valor.trim() : valor;
}

export class CrearVacunaDto {
  @ApiProperty({
    example: 1,
    description: 'Identificador del animal vacunado',
  })
  @IsInt({ message: 'Seleccione un animal' })
  @IsPositive({ message: 'Seleccione un animal' })
  animalId!: number;

  /**
   * Mismo orden de decoradores que CrearDesparasitacionDto.producto:
   * class-validator devuelve los errores en orden inverso al de declaracion,
   * asi que "obligatorio" se declara al final para que sea el primer mensaje
   * que ve el usuario cuando el campo llega vacio.
   */
  @ApiProperty({
    minLength: 1,
    maxLength: 120,
    example: 'Fiebre aftosa',
  })
  @Transform(normalizarTexto)
  @MaxLength(120, {
    message: 'El tipo de vacuna no puede superar 120 caracteres',
  })
  @IsNotEmpty({ message: 'El tipo de vacuna es obligatorio' })
  @IsString({ message: 'El tipo de vacuna es obligatorio' })
  tipoVacuna!: string;

  @ApiProperty({
    example: '2026-09-10',
    description: 'Fecha de aplicación; no puede ser futura',
  })
  @EsFechaNoFutura({
    message: 'Ingrese una fecha válida que no sea futura',
  })
  @IsNotEmpty({ message: 'La fecha es obligatoria' })
  fecha!: string;

  @ApiProperty({
    minLength: 1,
    maxLength: 50,
    example: '5 ml',
    description: 'Dosis aplicada',
  })
  @Transform(normalizarTexto)
  @MaxLength(50, {
    message: 'La dosis no puede superar 50 caracteres',
  })
  @IsNotEmpty({ message: 'La dosis es obligatoria' })
  @IsString({ message: 'La dosis es obligatoria' })
  dosis!: string;

  @ApiPropertyOptional({
    maxLength: 500,
    example: 'Refuerzo aplicado sin reacciones.',
  })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  @MaxLength(500, {
    message: 'Las observaciones no pueden superar 500 caracteres',
  })
  observaciones?: string;
}
