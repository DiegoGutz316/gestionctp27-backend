import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsDefined,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { transformarNumero } from './transformar-numero';
import { TieneDecimalesPermitidos } from './dos-decimales.validator';
import { VALOR_MAXIMO, VALOR_MAXIMO_TEXTO } from './limites-numericos';

function textoOpcional({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  if (typeof valor !== 'string') return valor;
  const limpio = valor.trim();
  return limpio === '' ? undefined : limpio;
}

export class RegistrarEntradaDto {
  @ApiProperty({
    type: Number,
    minimum: 0,
    exclusiveMinimum: true,
    maximum: VALOR_MAXIMO,
    description: 'Máximo 2 decimales; entero si el producto es por unidad',
  })
  @Transform(transformarNumero)
  @IsDefined({ message: 'La cantidad es obligatoria' })
  @IsNumber({}, { message: 'La cantidad debe ser un número válido' })
  @TieneDecimalesPermitidos({
    message: 'La cantidad admite como máximo 2 decimales',
  })
  @IsPositive({ message: 'La cantidad debe ser mayor que 0' })
  @Max(VALOR_MAXIMO, {
    message: `La cantidad no puede superar ${VALOR_MAXIMO_TEXTO}`,
  })
  cantidad!: number;

  @ApiProperty({ example: '2026-08-12', description: 'Fecha del movimiento' })
  @IsDefined({ message: 'La fecha es obligatoria' })
  @IsDateString(
    { strict: true },
    { message: 'Ingrese una fecha válida (AAAA-MM-DD)' },
  )
  fecha!: string;

  @ApiPropertyOptional({
    maxLength: 150,
    description: 'Procedencia del stock: compra, donación, proveedor…',
  })
  @Transform(textoOpcional)
  @IsOptional()
  @IsString({ message: 'El origen debe ser un texto' })
  @MaxLength(150, { message: 'El origen no puede superar 150 caracteres' })
  origen?: string;
}
