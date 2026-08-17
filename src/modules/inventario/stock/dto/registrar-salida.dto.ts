import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { transformarNumero } from './transformar-numero';
import { TieneDecimalesPermitidos } from './dos-decimales.validator';
import { VALOR_MAXIMO, VALOR_MAXIMO_TEXTO } from './limites-numericos';
import { EsFechaInventario } from './fecha-inventario.validator';

function textoOpcional({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  if (typeof valor !== 'string') return valor;
  const limpio = valor.trim();
  return limpio === '' ? undefined : limpio;
}

export class RegistrarSalidaDto {
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
  @EsFechaInventario()
  fecha!: string;

  @ApiProperty({
    maxLength: 200,
    description: 'Motivo de la salida: consumo, merma, traslado…',
  })
  @Transform(textoOpcional)
  @IsDefined({ message: 'El motivo es obligatorio' })
  @IsString({ message: 'El motivo debe ser un texto' })
  @IsNotEmpty({ message: 'El motivo es obligatorio' })
  @MaxLength(200, { message: 'El motivo no puede superar 200 caracteres' })
  motivo!: string;
}
