import { Transform } from 'class-transformer';
import { IsDefined, IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { transformarNumero } from './transformar-numero';
import { VALOR_MAXIMO } from './limites-numericos';
import { MontoCaja } from './monto-caja.validator';

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
  @MontoCaja('El fondo')
  monto!: number;
}
