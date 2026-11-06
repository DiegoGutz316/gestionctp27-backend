import { Transform, type TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

function normalizarMotivo({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class AnularAsientoDto {
  @ApiProperty({
    minLength: 5,
    maxLength: 250,
    example: 'Se registró como egreso por error; el movimiento correcto ya se anotó.',
    description: 'Motivo obligatorio de la anulación (trazabilidad)',
  })
  @Transform(normalizarMotivo)
  @IsString({ message: 'El motivo de anulación es obligatorio' })
  @IsNotEmpty({ message: 'Indique el motivo de la anulación' })
  @MinLength(5, {
    message: 'El motivo debe tener al menos 5 caracteres',
  })
  @MaxLength(250, {
    message: 'El motivo no puede superar 250 caracteres',
  })
  motivo!: string;
}
