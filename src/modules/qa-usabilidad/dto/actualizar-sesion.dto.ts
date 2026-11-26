import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { ResultadoUsab } from '../enums/resultado-usab.enum';

function trim({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function num({ value }: TransformFnParams): unknown {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || value.trim() === '') return value;
  return Number(value);
}

export class ActualizarSesionDto {
  @ApiPropertyOptional({ example: '09:15' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(8)
  horaInicio?: string;

  @ApiPropertyOptional({ example: '09:32' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(8)
  horaFin?: string;

  @ApiPropertyOptional()
  @Transform(num)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(600)
  tiempoMinutos?: number;

  @ApiPropertyOptional({ enum: ResultadoUsab })
  @IsOptional()
  @IsEnum(ResultadoUsab)
  resultado?: ResultadoUsab;

  @ApiPropertyOptional()
  @Transform(num)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  errores?: number;

  @ApiPropertyOptional()
  @Transform(num)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  ayudas?: number;

  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observaciones?: string;

  /** Motivo obligatorio al editar una sesión ya FINALIZADA. */
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivoCambio?: string;
}
