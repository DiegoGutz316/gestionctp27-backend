import { Transform, type TransformFnParams } from 'class-transformer';
import { IsDefined, IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
 * Backlog 5.1: "filtrar por animal y rango de fechas". Los tres campos son
 * obligatorios porque el objetivo del reporte es analizar el rendimiento de
 * un animal puntual en un periodo puntual, no un historial abierto.
 */
@RangoFechasReporteValido()
export class ConsultarReporteProduccionPecuariaDto {
  @ApiProperty({
    type: Number,
    minimum: 1,
    example: 1,
    description: 'Identificador del animal',
  })
  @Transform(transformarNumero)
  @IsDefined({ message: 'Seleccione un animal' })
  @IsInt({ message: 'Seleccione un animal válido' })
  @IsPositive({ message: 'Seleccione un animal válido' })
  animalId!: number;

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
