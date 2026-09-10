import { Transform } from 'class-transformer';
import { IsDefined, IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { transformarNumero } from '../../produccion/dto/transformar-numero';

export class ConsultarSaludDto {
  @ApiProperty({
    type: Number,
    minimum: 1,
    example: 1,
    description: 'Identificador del animal',
  })
  @Transform(transformarNumero)
  @IsDefined({ message: 'Seleccione un animal' })
  @IsInt({ message: 'Seleccione un animal válido' })
  @IsPositive({ message: 'Seleccione un animal válido' })
  animalId!: number;
}
