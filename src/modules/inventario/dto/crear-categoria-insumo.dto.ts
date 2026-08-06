import { Transform, type TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  return typeof valor === 'string' ? valor.trim() : valor;
}

export class CrearCategoriaInsumoDto {
  @ApiProperty({ minLength: 1, maxLength: 60 })
  @Transform(normalizarTexto)
  @IsString({ message: 'El nombre de la categoría es obligatorio' })
  @IsNotEmpty({ message: 'El nombre de la categoría es obligatorio' })
  @MaxLength(60, { message: 'El nombre no puede superar 60 caracteres' })
  nombre!: string;
}
