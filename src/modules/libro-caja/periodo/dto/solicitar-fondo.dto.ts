import { Transform } from 'class-transformer';
import { IsDefined, IsNumber, IsPositive, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { transformarNumero } from './transformar-numero';
import { TieneDecimalesPermitidos } from './dos-decimales.validator';
import { VALOR_MAXIMO, VALOR_MAXIMO_TEXTO } from './limites-numericos';

export class SolicitarFondoDto {
  @ApiProperty({
    type: Number,
    minimum: 0,
    exclusiveMinimum: true,
    maximum: VALOR_MAXIMO,
    example: 150000,
    description:
      'Monto del fondo de caja inicial (colones, máximo 2 decimales)',
  })
  @Transform(transformarNumero)
  @IsDefined({ message: 'El monto solicitado es obligatorio' })
  @IsNumber({}, { message: 'El monto solicitado debe ser un número válido' })
  @TieneDecimalesPermitidos({
    message: 'El monto admite como máximo 2 decimales',
  })
  @IsPositive({ message: 'El monto solicitado debe ser mayor que 0' })
  @Max(VALOR_MAXIMO, {
    message: `El monto solicitado no puede superar ${VALOR_MAXIMO_TEXTO}`,
  })
  montoSolicitado!: number;
}
