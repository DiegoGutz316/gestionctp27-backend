import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;

  return typeof valor === 'string' ? valor.trim() : valor;
}

export class EditarAnimalDto {
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
    minLength: 1,
    maxLength: 80,
    example: 'Bovino',
  })
  @Transform(normalizarTexto)
  @IsString({
    message: 'La especie del animal es obligatoria',
  })
  @IsNotEmpty({
    message: 'La especie del animal es obligatoria',
  })
  @MaxLength(80, {
    message: 'La especie no puede superar 80 caracteres',
  })
  especie!: string;

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
  })
  @IsDateString(
    {},
    {
      message: 'La fecha de nacimiento debe tener un formato de fecha válido',
    },
  )
  fechaNacimiento!: string;

  @ApiProperty({
    minLength: 1,
    maxLength: 50,
    example: 'ACTIVO',
  })
  @Transform(normalizarTexto)
  @IsString({
    message: 'El estado del animal es obligatorio',
  })
  @IsNotEmpty({
    message: 'El estado del animal es obligatorio',
  })
  @MaxLength(50, {
    message: 'El estado no puede superar 50 caracteres',
  })
  estado!: string;

  @ApiPropertyOptional({
    example: 'Animal en seguimiento veterinario.',
  })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString({
    message: 'Las observaciones deben ser texto',
  })
  observaciones?: string;
}
