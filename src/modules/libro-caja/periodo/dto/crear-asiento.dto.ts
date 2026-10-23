import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EsFechaIso } from './fecha-periodo.validator';
import { IngresoOEgresoExclusivo } from './ingreso-o-egreso.validator';
import { VALOR_MAXIMO } from './limites-numericos';
import { MontoCaja } from './monto-caja.validator';
import { transformarNumeroOCero } from './transformar-numero';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  return typeof valor === 'string' ? valor.trim() : valor;
}

function normalizarTextoOVacio({ value }: TransformFnParams): unknown {
  if (value === undefined || value === null) {
    return '';
  }
  return typeof value === 'string' ? value.trim() : value;
}

@IngresoOEgresoExclusivo()
export class CrearAsientoDto {
  @ApiProperty({ example: '2026-03-12', description: 'Fecha del asiento' })
  @IsDefined({ message: 'La fecha del asiento es obligatoria' })
  @EsFechaIso()
  fecha!: string;

  @ApiPropertyOptional({
    maxLength: 40,
    example: '7974975',
    description: 'Número de factura u otro comprobante',
  })
  @Transform(normalizarTextoOVacio)
  @IsString({ message: 'El número de factura debe ser texto' })
  @MaxLength(40, {
    message: 'El número de factura no puede superar 40 caracteres',
  })
  numeroFactura: string = '';

  @ApiProperty({
    minLength: 1,
    maxLength: 250,
    example: 'Venta de carne en canal',
  })
  @Transform(normalizarTexto)
  @IsString({ message: 'La descripción es obligatoria' })
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MaxLength(250, {
    message: 'La descripción no puede superar 250 caracteres',
  })
  descripcion!: string;

  @ApiProperty({
    type: Number,
    minimum: 0,
    maximum: VALOR_MAXIMO,
    example: 1200000,
    description: 'Ingreso en colones. Debe ser 0 si el asiento es un egreso.',
  })
  @Transform(transformarNumeroOCero)
  @MontoCaja('El ingreso')
  ingresos!: number;

  @ApiProperty({
    type: Number,
    minimum: 0,
    maximum: VALOR_MAXIMO,
    example: 0,
    description: 'Egreso en colones. Debe ser 0 si el asiento es un ingreso.',
  })
  @Transform(transformarNumeroOCero)
  @MontoCaja('El egreso')
  egresos!: number;
}
