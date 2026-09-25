import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { EsFechaNoFutura } from '../../../../common/validacion/fecha-no-futura.validator';
import { RangoFechasReporteValido } from '../../comun/validadores/rango-fechas-reporte.validator';

function transformarNumero({ value }: TransformFnParams): unknown {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || value.trim() === '') return undefined;

  return Number(value);
}

function normalizarTexto({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;

  const texto = value.trim();

  return texto === '' ? undefined : texto;
}

/**
 * Backlog 5.2: "filtrar por cultivo, cama de cultivo y rango de fechas".
 *
 * `cultivo` y `camaId` son opcionales (mismo patron que
 * ConsultarCosechasDto), pero `fechaInicio`/`fechaFin` son obligatorios: el
 * reporte necesita un periodo claro para tener sentido, a diferencia del
 * historial abierto que consulta CosechaService.consultar.
 */
@RangoFechasReporteValido()
export class ConsultarReporteProduccionAgricolaDto {
  @ApiPropertyOptional({
    example: 'Tomate',
    description: 'Coincidencia parcial e insensible a mayúsculas',
  })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString({ message: 'Ingrese un cultivo válido' })
  @MinLength(1, { message: 'Ingrese un cultivo válido' })
  @MaxLength(120, { message: 'El filtro no puede superar 120 caracteres' })
  cultivo?: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    example: 1,
    description: 'Id de la cama de cultivo',
  })
  @Transform(transformarNumero)
  @IsOptional()
  @IsInt({ message: 'Seleccione una cama de cultivo válida' })
  @IsPositive({ message: 'Seleccione una cama de cultivo válida' })
  camaId?: number;

  @ApiProperty({
    example: '2026-09-01',
    description: 'Fecha inicial del período del reporte',
  })
  @Transform(normalizarTexto)
  @IsDefined({ message: 'La fecha inicial es obligatoria' })
  @EsFechaNoFutura({
    message: 'Ingrese una fecha inicial válida que no sea futura',
  })
  fechaInicio!: string;

  @ApiProperty({
    example: '2026-09-30',
    description: 'Fecha final del período del reporte',
  })
  @Transform(normalizarTexto)
  @IsDefined({ message: 'La fecha final es obligatoria' })
  @EsFechaNoFutura({
    message: 'Ingrese una fecha final válida que no sea futura',
  })
  fechaFin!: string;
}
