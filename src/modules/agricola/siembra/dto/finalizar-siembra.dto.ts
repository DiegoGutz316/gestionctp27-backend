import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { MotivoFinalizacionSiembra } from '../enums/motivo-finalizacion.enum';

function normalizarTexto({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;

  const texto = value.trim();

  return texto === '' ? undefined : texto;
}

export class FinalizarSiembraDto {
  @ApiProperty({
    enum: MotivoFinalizacionSiembra,
    example: MotivoFinalizacionSiembra.PERDIDA,
  })
  @IsEnum(MotivoFinalizacionSiembra, {
    message: 'Seleccione un motivo de finalización',
  })
  motivo!: MotivoFinalizacionSiembra;

  @ApiPropertyOptional({
    maxLength: 500,
    example: 'El cultivo se retiró para rotar la cama.',
  })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString({ message: 'El motivo debe ser texto' })
  @MaxLength(500, {
    message: 'El motivo no puede superar 500 caracteres',
  })
  detalle?: string;
}
