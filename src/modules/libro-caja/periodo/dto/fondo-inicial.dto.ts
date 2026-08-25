import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsNumber,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { transformarNumero } from './transformar-numero';
import { TieneDecimalesPermitidos } from './dos-decimales.validator';
import { VALOR_MAXIMO, VALOR_MAXIMO_TEXTO } from './limites-numericos';

export class FondoInicialDto {
  @ApiProperty({ type: Number, minimum: 1, example: 1 })
  @Transform(transformarNumero)
  @IsDefined({ message: 'El departamento es obligatorio' })
  @IsInt({ message: 'El departamento es inválido' })
  @IsPositive({ message: 'El departamento es inválido' })
  departamentoId!: number;

  @ApiProperty({
    type: Number,
    minimum: 0,
    maximum: VALOR_MAXIMO,
    example: 150000,
    description:
      'Saldo de caja que queda de periodos anteriores (colones). Se escribe a mano; puede ser 0.',
  })
  @Transform(transformarNumero)
  @IsDefined({ message: 'El fondo del departamento es obligatorio' })
  @IsNumber({}, { message: 'El fondo debe ser un número válido' })
  @TieneDecimalesPermitidos({
    message: 'El fondo admite como máximo 2 decimales',
  })
  @Min(0, { message: 'El fondo no puede ser negativo' })
  @Max(VALOR_MAXIMO, {
    message: `El fondo no puede superar ${VALOR_MAXIMO_TEXTO}`,
  })
  monto!: number;
}
