import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RestablecerContrasenaDto {
  @ApiProperty({ description: 'Token recibido por correo' })
  @IsString({ message: 'El enlace de restablecimiento no es válido' })
  @IsNotEmpty({ message: 'El enlace de restablecimiento no es válido' })
  @MaxLength(200)
  token!: string;

  @ApiProperty({ minLength: 8, maxLength: 72, writeOnly: true })
  @IsString({ message: 'La nueva contraseña es obligatoria' })
  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, {
    message: 'La contraseña no puede superar 72 caracteres',
  })
  contrasenaNueva!: string;
}
