import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { EsFechaNoFutura } from '../../../../common/validacion/fecha-no-futura.validator';
import { EspecieAnimal } from '../enums/especie-animal.enum';
import { EstadoAnimal } from '../enums/estado-animal.enum';
import { CategoriaBovina } from '../enums/categoria-bovina.enum';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;

  return typeof valor === 'string' ? valor.trim() : valor;
}

export class CrearAnimalDto {
  @ApiProperty({
    minLength: 1,
    maxLength: 50,
    example: 'BOV-001',
  })
  @Transform(normalizarTexto)
  @IsString({
    message: 'El código del animal es obligatorio',
  })
  @IsNotEmpty({
    message: 'El código del animal es obligatorio',
  })
  @MaxLength(50, {
    message: 'El código no puede superar 50 caracteres',
  })
  codigo!: string;

  @ApiProperty({
    minLength: 1,
    maxLength: 120,
    example: 'Luna',
  })
  @Transform(normalizarTexto)
  @IsString({
    message: 'El nombre del animal es obligatorio',
  })
  @IsNotEmpty({
    message: 'El nombre del animal es obligatorio',
  })
  @MaxLength(120, {
    message: 'El nombre no puede superar 120 caracteres',
  })
  nombre!: string;

  @ApiProperty({
    enum: EspecieAnimal,
    enumName: 'EspecieAnimal',
    example: EspecieAnimal.VACA,
  })
  @IsEnum(EspecieAnimal, {
    message: 'Seleccione una especie válida',
  })
  especie!: EspecieAnimal;

  @ApiProperty({
    minLength: 1,
    maxLength: 100,
    example: 'Holstein',
  })
  @Transform(normalizarTexto)
  @IsString({
    message: 'La raza del animal es obligatoria',
  })
  @IsNotEmpty({
    message: 'La raza del animal es obligatoria',
  })
  @MaxLength(100, {
    message: 'La raza no puede superar 100 caracteres',
  })
  raza!: string;

  @ApiProperty({
    example: '2024-03-15',
    description: 'Fecha de nacimiento; no puede ser futura',
  })
  @EsFechaNoFutura({
    message: 'La fecha de nacimiento no puede ser futura',
  })
  @IsDateString(
    { strict: true },
    {
      message: 'La fecha de nacimiento debe tener un formato de fecha válido',
    },
  )
  fechaNacimiento!: string;

  @ApiProperty({
    enum: EstadoAnimal,
    enumName: 'EstadoAnimal',
    example: EstadoAnimal.ACTIVO,
  })
  @IsEnum(EstadoAnimal, {
    message: 'Seleccione un estado válido',
  })
  estado!: EstadoAnimal;

  @ApiPropertyOptional({
    enum: CategoriaBovina,
    enumName: 'CategoriaBovina',
    example: CategoriaBovina.VACA,
    description: 'Obligatoria si la especie es VACA (plantilla de ganado bovino)',
  })
  @Transform(({ value }: TransformFnParams): unknown => {
    if (typeof value === 'string' && value.trim() === '') {
      return undefined;
    }

    return value;
  })
  @IsOptional()
  @IsEnum(CategoriaBovina, {
    message: 'Seleccione si es toro, novilla, vaca, ternero/a o torete',
  })
  categoriaBovina?: CategoriaBovina;

  @ApiPropertyOptional({
    example: 'Animal en buenas condiciones.',
  })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString({
    message: 'Las observaciones deben ser texto',
  })
  observaciones?: string;
}
