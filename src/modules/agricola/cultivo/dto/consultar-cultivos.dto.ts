import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { TipoCultivo } from '../enums/tipo-cultivo.enum';

function aBooleano({ value }: TransformFnParams): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;

  return value;
}

export class ConsultarCultivosDto {
  @ApiPropertyOptional({
    description: 'Deja fuera los cultivos desactivados',
  })
  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean({ message: 'El filtro de activos debe ser verdadero o falso' })
  soloActivos?: boolean;

  @ApiPropertyOptional({ enum: TipoCultivo, enumName: 'TipoCultivo' })
  @IsOptional()
  @IsEnum(TipoCultivo, { message: 'Seleccione un tipo de cultivo válido' })
  tipo?: TipoCultivo;

  @ApiPropertyOptional({ description: 'Busca por nombre, ignorando tildes' })
  @IsOptional()
  @IsString({ message: 'Ingrese un texto de búsqueda' })
  @MaxLength(120, { message: 'La búsqueda no puede superar 120 caracteres' })
  q?: string;
}
