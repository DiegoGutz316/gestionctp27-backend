import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsDefined,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { CODIGOS_PRUEBA_USAB } from '../catalogo/pruebas-usab';
import { ResultadoUsab } from '../enums/resultado-usab.enum';

function trim({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function num({ value }: TransformFnParams): unknown {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || value.trim() === '') return value;
  return Number(value);
}

export class CrearSesionDto {
  @ApiProperty()
  @Transform(num)
  @IsDefined()
  @IsInt()
  @IsPositive()
  participanteId!: number;

  @ApiProperty({ example: 'USAB-01', enum: CODIGOS_PRUEBA_USAB })
  @Transform(trim)
  @IsString()
  @IsIn([...CODIGOS_PRUEBA_USAB], {
    message: 'Seleccione una prueba USAB-01…USAB-10',
  })
  pruebaCodigo!: string;

  @ApiProperty({ example: '2026-11-10' })
  @IsDateString({}, { message: 'Indique la fecha de ejecución' })
  fechaEjecucion!: string;

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

  @ApiPropertyOptional({ default: 0 })
  @Transform(num)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  errores?: number;

  @ApiPropertyOptional({ default: 0 })
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
}
