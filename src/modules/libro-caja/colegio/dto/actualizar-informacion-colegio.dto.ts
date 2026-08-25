import { Transform, type TransformFnParams } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  return typeof valor === 'string' ? valor.trim() : valor;
}

export class ActualizarInformacionColegioDto {
  @ApiProperty({
    minLength: 2,
    maxLength: 150,
    example: 'CTP 27 de abril',
  })
  @Transform(normalizarTexto)
  @IsString({ message: 'El nombre del colegio es obligatorio' })
  @IsNotEmpty({ message: 'El nombre del colegio es obligatorio' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(150, { message: 'El nombre no puede superar 150 caracteres' })
  nombre!: string;

  @ApiProperty({
    minLength: 1,
    maxLength: 50,
    example: '001-0001234-5',
    description: 'Número de cuenta bancaria donde se depositan los fondos',
  })
  @Transform(normalizarTexto)
  @IsString({ message: 'El número de cuenta bancaria es obligatorio' })
  @IsNotEmpty({ message: 'El número de cuenta bancaria es obligatorio' })
  @MaxLength(50, {
    message: 'El número de cuenta no puede superar 50 caracteres',
  })
  numeroCuentaBancaria!: string;

  @ApiProperty({
    minLength: 2,
    maxLength: 150,
    example: 'Banco Nacional de Costa Rica',
    description: 'Entidad en la que se depositaron los fondos',
  })
  @Transform(normalizarTexto)
  @IsString({ message: 'La entidad de depósito es obligatoria' })
  @IsNotEmpty({ message: 'La entidad de depósito es obligatoria' })
  @MinLength(2, {
    message: 'La entidad de depósito debe tener al menos 2 caracteres',
  })
  @MaxLength(150, {
    message: 'La entidad de depósito no puede superar 150 caracteres',
  })
  entidadDeposito!: string;
}
