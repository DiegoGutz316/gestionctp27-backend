import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsInt,
  IsNumber,
  IsPositive,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { UnidadSiembra } from '../enums/unidad-siembra.enum';
import { EsFechaNoFutura } from '../../../../common/validacion/fecha-no-futura.validator';
import { TieneMaximoDosDecimales } from './dos-decimales.validator';
import { transformarNumero } from './transformar-numero';

const CANTIDAD_MAXIMA = 9_999_999_999.99;

export class RegistrarSiembraDto {
  @ApiProperty({ type: Number, minimum: 1, example: 1 })
  @Transform(transformarNumero)
  @IsDefined({ message: 'Seleccione una cama de cultivo' })
  @IsInt({ message: 'Seleccione una cama de cultivo válida' })
  @IsPositive({ message: 'Seleccione una cama de cultivo válida' })
  camaId!: number;

  @ApiProperty({
    type: Number,
    minimum: 1,
    example: 1,
    description: 'Cultivo del catálogo que se siembra',
  })
  @Transform(transformarNumero)
  @IsDefined({ message: 'Seleccione un cultivo' })
  @IsInt({ message: 'Seleccione un cultivo válido' })
  @IsPositive({ message: 'Seleccione un cultivo válido' })
  cultivoId!: number;

  @ApiProperty({ example: '2026-09-15', description: 'Fecha AAAA-MM-DD' })
  @IsDefined({ message: 'La fecha de siembra es obligatoria' })
  @EsFechaNoFutura({
    message: 'Ingrese una fecha de siembra válida que no sea futura',
  })
  fechaSiembra!: string;

  @ApiProperty({
    type: Number,
    minimum: 0,
    exclusiveMinimum: true,
    example: 50,
  })
  @Transform(transformarNumero)
  @IsDefined({ message: 'La cantidad sembrada es obligatoria' })
  @IsNumber({}, { message: 'La cantidad sembrada debe ser un número válido' })
  @TieneMaximoDosDecimales({
    message: 'La cantidad sembrada admite como máximo 2 decimales',
  })
  @IsPositive({ message: 'La cantidad sembrada debe ser mayor a cero' })
  @Max(CANTIDAD_MAXIMA, {
    message: 'La cantidad sembrada supera el máximo permitido',
  })
  cantidadSembrada!: number;

  @ApiProperty({
    enum: UnidadSiembra,
    enumName: 'UnidadSiembra',
    example: UnidadSiembra.UNIDADES,
    description: 'En qué se cuenta lo sembrado',
  })
  @IsEnum(UnidadSiembra, {
    message: 'Seleccione una unidad válida',
  })
  @IsDefined({ message: 'Seleccione la unidad de lo sembrado' })
  unidadSembrada!: UnidadSiembra;
}
