import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

function normalizarCorreo({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class ActualizarPerfilDto {
  @ApiProperty({ minLength: 2, maxLength: 120 })
  @IsString({ message: 'El nombre es obligatorio' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres' })
  nombre!: string;

  @ApiProperty({ maxLength: 150, example: 'usuario@ctp27abril.ed.cr' })
  @Transform(normalizarCorreo)
  @IsString({ message: 'El correo es obligatorio' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  @MaxLength(150, { message: 'El correo no puede superar 150 caracteres' })
  @IsEmail({}, { message: 'Debe ingresar un correo válido' })
  correo!: string;
}
