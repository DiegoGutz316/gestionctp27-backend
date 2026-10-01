import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { EsFechaNoFutura } from '../../../../common/validacion/fecha-no-futura.validator';
import { TipoProducto } from '../../../inventario/producto/enums/tipo-producto.enum';
import { RangoFechasReporteValido } from '../../comun/validadores/rango-fechas-reporte.validator';

function transformarNumero({ value }: TransformFnParams): unknown {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  return Number(value);
}

function normalizarTexto({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const texto = value.trim();

  return texto === '' ? undefined : texto;
}

@RangoFechasReporteValido()
export class ConsultarReporteInventarioDto {
  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    description: 'Identificador del insumo o producto',
  })
  @Transform(transformarNumero)
  @IsOptional()
  @IsInt({
    message: 'Seleccione un producto válido',
  })
  @IsPositive({
    message: 'Seleccione un producto válido',
  })
  productoId?: number;

  @ApiPropertyOptional({
    enum: TipoProducto,
    enumName: 'TipoProducto',
    description: 'Categoría del producto',
  })
  @IsOptional()
  @IsEnum(TipoProducto, {
    message: 'Seleccione una categoría válida',
  })
  tipoProducto?: TipoProducto;

  @ApiProperty({
    example: '2026-09-01',
    description: 'Fecha inicial del período',
  })
  @Transform(normalizarTexto)
  @IsDefined({
    message: 'La fecha inicial es obligatoria',
  })
  @EsFechaNoFutura({
    message: 'Ingrese una fecha inicial válida que no sea futura',
  })
  fechaInicio!: string;

  @ApiProperty({
    example: '2026-09-30',
    description: 'Fecha final del período',
  })
  @Transform(normalizarTexto)
  @IsDefined({
    message: 'La fecha final es obligatoria',
  })
  @EsFechaNoFutura({
    message: 'Ingrese una fecha final válida que no sea futura',
  })
  fechaFin!: string;
}
