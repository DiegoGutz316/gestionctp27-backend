import { Transform, type TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  return typeof valor === 'string' ? valor.trim() : valor;
}

export class CrearDepartamentoDto {
  @ApiProperty({ minLength: 1, maxLength: 120, example: 'Unidad Agrícola' })
  @Transform(normalizarTexto)
  @IsString({ message: 'El nombre de la unidad es obligatorio' })
  @IsNotEmpty({ message: 'El nombre de la unidad es obligatorio' })
  @MaxLength(120, {
    message: 'El nombre de la unidad no puede superar 120 caracteres',
  })
  nombreUnidad!: string;

  @ApiProperty({
    minLength: 1,
    maxLength: 120,
    example: 'Producción agrícola',
  })
  @Transform(normalizarTexto)
  @IsString({ message: 'El tipo de actividad es obligatorio' })
  @IsNotEmpty({ message: 'El tipo de actividad es obligatorio' })
  @MaxLength(120, {
    message: 'El tipo de actividad no puede superar 120 caracteres',
  })
  tipoActividad!: string;
}
