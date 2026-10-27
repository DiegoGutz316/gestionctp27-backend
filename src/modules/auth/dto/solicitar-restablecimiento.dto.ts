import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

function normalizarCorreo({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class SolicitarRestablecimientoDto {
  @ApiProperty({ example: 'usuario@ctp27abril.ed.cr' })
  @Transform(normalizarCorreo)
  @IsEmail({}, { message: 'Ingrese un correo electrónico válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  @MaxLength(150, { message: 'El correo no puede superar 150 caracteres' })
  correo!: string;
}
