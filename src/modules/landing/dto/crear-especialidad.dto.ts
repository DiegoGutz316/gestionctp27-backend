import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IconoEspecialidad } from '../enums/icono-especialidad.enum';

function normalizarTexto({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CrearEspecialidadDto {
  @ApiProperty({ maxLength: 120 })
  @Transform(normalizarTexto)
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres' })
  nombre!: string;

  @ApiProperty({ maxLength: 400 })
  @Transform(normalizarTexto)
  @IsString()
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MaxLength(400, {
    message: 'La descripción no puede superar 400 caracteres',
  })
  descripcion!: string;

  @ApiProperty({ enum: IconoEspecialidad })
  @IsEnum(IconoEspecialidad, { message: 'Seleccione un icono válido' })
  icono!: IconoEspecialidad;

  @ApiProperty({ example: 'var(--acento-agro)', maxLength: 60 })
  @Transform(normalizarTexto)
  @IsString()
  @IsNotEmpty({ message: 'El color de acento es obligatorio' })
  @MaxLength(60)
  acento!: string;

  @ApiPropertyOptional({ maxLength: 250 })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString()
  @MaxLength(250)
  fotoAlt?: string;

  @ApiPropertyOptional({ maxLength: 40, example: 'center 45%' })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  posicionFoto?: string;

  @ApiPropertyOptional({ description: 'Orden de aparición (menor primero)' })
  @IsOptional()
  @IsInt({ message: 'El orden debe ser un número entero' })
  @Min(0)
  orden?: number;
}
