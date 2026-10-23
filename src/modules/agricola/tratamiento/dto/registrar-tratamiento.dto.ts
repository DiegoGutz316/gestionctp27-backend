import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { EsFechaNoFutura } from '../../../../common/validacion/fecha-no-futura.validator';
import { TieneMaximoDosDecimales } from '../../siembra/dto/dos-decimales.validator';
import { ActividadAgricola } from '../enums/actividad-agricola.enum';
import { TipoTratamiento } from '../enums/tipo-tratamiento.enum';
import { ProductoSegunActividad } from './producto-segun-actividad.validator';
import { UnidadTratamiento } from '../enums/unidad-tratamiento.enum';

const CANTIDAD_MAXIMA = 9_999_999_999.99;

function normalizarTexto({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function transformarNumero({ value }: TransformFnParams): unknown {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return value;
  }

  return Number(value);
}

function normalizarObservaciones({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const texto = value.trim();

  return texto === '' ? undefined : texto;
}

@ProductoSegunActividad()
export class RegistrarTratamientoDto {
  @ApiProperty({
    type: Number,
    minimum: 1,
    example: 1,
  })
  @Transform(transformarNumero)
  @IsDefined({
    message: 'Seleccione una siembra',
  })
  @IsInt({
    message: 'Seleccione una siembra válida',
  })
  @IsPositive({
    message: 'Seleccione una siembra válida',
  })
  siembraId!: number;

  @ApiProperty({
    enum: ActividadAgricola,
    enumName: 'ActividadAgricola',
    example: ActividadAgricola.RIEGO,
    description: 'Riego, limpieza, fertilización o tratamiento',
  })
  @IsEnum(ActividadAgricola, {
    message: 'Seleccione una actividad válida',
  })
  @IsDefined({
    message: 'Seleccione la actividad realizada',
  })
  actividad!: ActividadAgricola;

  @ApiPropertyOptional({
    enum: TipoTratamiento,
    enumName: 'TipoTratamiento',
    example: TipoTratamiento.FERTILIZANTE,
    description: 'Solo cuando la actividad aplica un producto',
  })
  @IsOptional()
  @IsEnum(TipoTratamiento, {
    message: 'Seleccione un tipo de tratamiento válido',
  })
  tipo?: TipoTratamiento;

  @ApiPropertyOptional({
    example: 'Fertilizante NPK 10-30-10',
    maxLength: 120,
    description: 'Solo cuando la actividad aplica un producto',
  })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString({
    message: 'El producto aplicado es obligatorio',
  })
  @MinLength(1, {
    message: 'El producto aplicado es obligatorio',
  })
  @MaxLength(120, {
    message: 'El producto aplicado no puede superar 120 caracteres',
  })
  producto?: string;

  @ApiProperty({
    example: '2026-09-17',
    description: 'Fecha AAAA-MM-DD',
  })
  @IsDefined({
    message: 'La fecha del tratamiento es obligatoria',
  })
  @EsFechaNoFutura({
    message: 'Ingrese una fecha de tratamiento válida que no sea futura',
  })
  fecha!: string;

  @ApiPropertyOptional({
    type: Number,
    minimum: 0,
    exclusiveMinimum: true,
    example: 2.5,
    description: 'Solo cuando la actividad aplica un producto',
  })
  @Transform(transformarNumero)
  @IsOptional()
  @IsNumber({}, { message: 'La cantidad aplicada debe ser un número válido' })
  @TieneMaximoDosDecimales({
    message: 'La cantidad aplicada admite como máximo 2 decimales',
  })
  @IsPositive({
    message: 'La cantidad aplicada debe ser mayor a cero',
  })
  @Max(CANTIDAD_MAXIMA, {
    message: 'La cantidad aplicada supera el máximo permitido',
  })
  cantidad?: number;

  @ApiPropertyOptional({
    enum: UnidadTratamiento,
    enumName: 'UnidadTratamiento',
    example: UnidadTratamiento.KG,
    description: 'Solo cuando la actividad aplica un producto',
  })
  @IsOptional()
  @IsEnum(UnidadTratamiento, {
    message: 'Seleccione una unidad válida',
  })
  unidad?: UnidadTratamiento;

  @ApiPropertyOptional({
    example: 'Aplicado después del riego de la mañana.',
  })
  @Transform(normalizarObservaciones)
  @IsOptional()
  @IsString({
    message: 'Las observaciones deben ser texto',
  })
  observaciones?: string;
}
