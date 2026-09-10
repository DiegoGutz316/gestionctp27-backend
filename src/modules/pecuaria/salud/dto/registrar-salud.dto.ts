import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { transformarNumero } from '../../produccion/dto/transformar-numero';
import { EsFechaProduccion } from '../../produccion/dto/fecha-produccion.validator';
import { CondicionSalud } from '../enums/condicion-salud.enum';

function textoOpcional({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const limpio = value.trim();
  return limpio === '' ? undefined : limpio;
}

export class RegistrarSaludDto {
  @ApiProperty({
    type: Number,
    minimum: 1,
    example: 1,
    description: 'Identificador del animal',
  })
  @Transform(transformarNumero)
  @IsDefined({ message: 'Seleccione un animal' })
  @IsInt({ message: 'Seleccione un animal válido' })
  @IsPositive({ message: 'Seleccione un animal válido' })
  animalId!: number;

  @ApiProperty({
    example: '2026-09-08',
    description: 'Fecha de la observación (AAAA-MM-DD)',
  })
  @IsDefined({ message: 'La fecha es obligatoria' })
  @EsFechaProduccion()
  fecha!: string;

  @ApiProperty({
    enum: CondicionSalud,
    enumName: 'CondicionSalud',
    example: CondicionSalud.SANO,
  })
  @IsEnum(CondicionSalud, {
    message: 'Seleccione una condición observada válida',
  })
  condicionObservada!: CondicionSalud;

  @ApiPropertyOptional({
    maxLength: 500,
    example: 'Mastitis en cuarto posterior izquierdo',
  })
  @Transform(textoOpcional)
  @IsOptional()
  @IsString({ message: 'El diagnóstico debe ser texto' })
  @IsNotEmpty({ message: 'El diagnóstico no puede estar vacío' })
  @MaxLength(500, {
    message: 'El diagnóstico no puede superar 500 caracteres',
  })
  diagnostico?: string;

  @ApiPropertyOptional({
    maxLength: 1000,
    example: 'Se aisló del resto del hato y se inició tratamiento.',
  })
  @Transform(textoOpcional)
  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  @MaxLength(1000, {
    message: 'Las observaciones no pueden superar 1000 caracteres',
  })
  observaciones?: string;
}
