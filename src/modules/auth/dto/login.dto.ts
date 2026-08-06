import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

function normalizarCorreo({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  return typeof valor === 'string' ? valor.trim().toLowerCase() : valor;
}

export class LoginDto {
  @ApiProperty({ example: 'admin@ctp27abril.ed.cr', maxLength: 150 })
  @Transform(normalizarCorreo)
  @IsString({ message: 'El correo es obligatorio.' })
  @IsNotEmpty({ message: 'El correo es obligatorio.' })
  @MaxLength(150, { message: 'El correo no puede superar 150 caracteres.' })
  @IsEmail({}, { message: 'El correo no tiene un formato válido.' })
  correo!: string;

  @ApiProperty({ minLength: 1, maxLength: 72, writeOnly: true })
  @IsString({ message: 'La contraseña es obligatoria.' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MaxLength(72, {
    message: 'La contraseña no puede superar 72 caracteres.',
  })
  contrasena!: string;
}
