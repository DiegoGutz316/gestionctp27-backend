import { Transform, type TransformFnParams } from 'class-transformer';
import { IsDefined, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

function normalizarTexto({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class ConsultarTratamientosDto {
  @ApiProperty({
    example: 'Tomate',
    maxLength: 120,
  })
  @Transform(normalizarTexto)
  @IsDefined({
    message: 'El cultivo es obligatorio',
  })
  @IsString({
    message: 'El cultivo es obligatorio',
  })
  @MinLength(1, {
    message: 'El cultivo es obligatorio',
  })
  @MaxLength(120, {
    message: 'El cultivo no puede superar 120 caracteres',
  })
  cultivo!: string;
}
