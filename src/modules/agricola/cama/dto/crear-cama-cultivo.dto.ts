import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { EstadoCamaCultivo } from '../enums/estado-cama-cultivo.enum';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;

  return typeof valor === 'string' ? valor.trim() : valor;
}

export class CrearCamaCultivoDto {
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

  /**
   * El estado ya no se elige al registrar: una cama de cultivo va con una
   * siembra, asi que nace DISPONIBLE y cambia con lo que pase en ella. El
   * formulario dejo de enviarlo, y exigirlo aqui devolvia 400 "Seleccione un
   * estado valido" sin que existiera ningun campo donde elegirlo.
   *
   * Se sigue aceptando si viene, para no romper a quien ya lo mandaba.
   */
  @ApiPropertyOptional({
    enum: EstadoCamaCultivo,
    enumName: 'EstadoCamaCultivo',
    example: EstadoCamaCultivo.DISPONIBLE,
    description: 'Opcional. Si no viene, la cama se registra como DISPONIBLE',
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
