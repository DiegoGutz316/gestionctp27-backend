import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDateString,
  IsDefined,
  IsInt,
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

/** Quita los espacios sobrantes del texto. */
function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  return typeof valor === 'string' ? valor.trim() : valor;
}

/**
 * Backlog 4.6: registrar una salida de inventario.
 *
 * A diferencia del `origen` de las entradas, aquí el `motivo` es obligatorio:
 * el documento lo lista entre los datos a ingresar y una reducción de stock sin
 * justificación no permite controlar el uso de los recursos.
 *
 * El tope de existencia disponible NO se valida aquí: depende del stock del
 * momento y se comprueba en el servicio, dentro de la transacción.
 */
export class RegistrarSalidaDto {
  @ApiProperty({ type: Number, minimum: 1, description: 'Id del insumo' })
  @Transform(transformarNumero)
  @IsDefined({ message: 'Seleccione un insumo' })
  @IsInt({ message: 'Seleccione un insumo' })
  @IsPositive({ message: 'Seleccione un insumo' })
  insumoId!: number;

  @ApiProperty({
    type: Number,
    minimum: 0,
    exclusiveMinimum: true,
    maximum: VALOR_MAXIMO,
    description: 'Máximo 2 decimales (la columna es numeric(12,2))',
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

  @ApiProperty({ example: '2026-08-14', description: 'Fecha del movimiento' })
  @IsDefined({ message: 'La fecha es obligatoria' })
  @IsDateString(
    { strict: true },
    { message: 'Ingrese una fecha válida (AAAA-MM-DD)' },
  )
  fecha!: string;

  @ApiProperty({
    maxLength: 200,
    description: 'Para qué se usaron los insumos',
  })
  @Transform(normalizarTexto)
  @IsString({ message: 'El motivo es obligatorio' })
  @IsNotEmpty({ message: 'El motivo es obligatorio' })
  @MaxLength(200, { message: 'El motivo no puede superar 200 caracteres' })
  motivo!: string;
}
