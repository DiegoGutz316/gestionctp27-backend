import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { EstadoCamaCultivo } from '../enums/estado-cama-cultivo.enum';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;

  return typeof valor === 'string' ? valor.trim() : valor;
}

export class EditarCamaCultivoDto {
  @ApiProperty({
    minLength: 1,
    maxLength: 50,
    example: 'CAMA-001',
  })
  @Transform(normalizarTexto)
  @IsString({
    message: 'El código de la cama es obligatorio',
  })
  @IsNotEmpty({
    message: 'El código de la cama es obligatorio',
  })
  @MaxLength(50, {
    message: 'El código no puede superar 50 caracteres',
  })
  codigo!: string;

  @ApiProperty({
    minLength: 1,
    maxLength: 120,
    example: 'Invernadero 1',
  })
  @Transform(normalizarTexto)
  @IsString({
    message: 'La ubicación de la cama es obligatoria',
  })
  @IsNotEmpty({
    message: 'La ubicación de la cama es obligatoria',
  })
  @MaxLength(120, {
    message: 'La ubicación no puede superar 120 caracteres',
  })
  ubicacion!: string;

  @ApiPropertyOptional({
    enum: EstadoCamaCultivo,
    enumName: 'EstadoCamaCultivo',
    example: EstadoCamaCultivo.DISPONIBLE,
    description:
      'Si se omite, se conserva el estado actual. La edición desde el formulario no envía este campo.',
  })
  @IsOptional()
  @IsEnum(EstadoCamaCultivo, {
    message: 'Seleccione un estado válido',
  })
  estado?: EstadoCamaCultivo;

  @ApiPropertyOptional({
    example: 'Cama con riego por goteo instalado.',
  })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString({
    message: 'Las observaciones deben ser texto',
  })
  observaciones?: string;
}
