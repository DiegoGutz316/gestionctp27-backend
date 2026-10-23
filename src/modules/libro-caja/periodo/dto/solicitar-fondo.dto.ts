import { Transform } from 'class-transformer';
import { IsDefined } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { transformarNumero } from './transformar-numero';
import { VALOR_MAXIMO } from './limites-numericos';
import { MontoCaja } from './monto-caja.validator';

export class SolicitarFondoDto {
  @ApiProperty({
    type: Number,
    minimum: 0,
    maximum: VALOR_MAXIMO,
    example: 150000,
    description:
      'Monto del fondo de caja inicial (colones, máximo 2 decimales)',
  })
  @Transform(transformarNumero)
  @IsDefined({ message: 'El monto solicitado es obligatorio' })
  @MontoCaja('El monto solicitado')
  montoSolicitado!: number;
}
