import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UnidadMedida } from '../enums/unidad-medida.enum';
import { transformarNumero } from './transformar-numero';
import {
  DECIMALES_PERMITIDOS,
  VALOR_MAXIMO,
  VALOR_MAXIMO_TEXTO,
} from './limites-numericos';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  return typeof valor === 'string' ? valor.trim() : valor;
}

export class EditarInsumoDto {
  @ApiProperty({ minLength: 1, maxLength: 120 })
  @Transform(normalizarTexto)
  @IsString({ message: 'El nombre del insumo es obligatorio' })
  @IsNotEmpty({ message: 'El nombre del insumo es obligatorio' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres' })
  nombre!: string;

  @ApiProperty({ type: Number, minimum: 1 })
  @Transform(transformarNumero)
  @IsDefined({ message: 'Seleccione una categoría' })
  @IsInt({ message: 'Seleccione una categoría' })
  @IsPositive({ message: 'Seleccione una categoría' })
  categoriaId!: number;

  @ApiProperty({ enum: UnidadMedida, enumName: 'UnidadMedida' })
  @IsEnum(UnidadMedida, {
    message: 'Seleccione una unidad de medida válida',
  })
  unidadMedida!: UnidadMedida;

  @ApiProperty({ type: Number, minimum: 0, maximum: VALOR_MAXIMO })
  @Transform(transformarNumero)
  @IsDefined({ message: 'El nivel mínimo es obligatorio' })
  @IsNumber(
    { maxDecimalPlaces: DECIMALES_PERMITIDOS },
    { message: 'El nivel mínimo admite como máximo 2 decimales' },
  )
  @Min(0, { message: 'El nivel mínimo debe ser 0 o mayor' })
  @Max(VALOR_MAXIMO, {
    message: `El nivel mínimo no puede superar ${VALOR_MAXIMO_TEXTO}`,
  })
  nivelMinimo!: number;
}
