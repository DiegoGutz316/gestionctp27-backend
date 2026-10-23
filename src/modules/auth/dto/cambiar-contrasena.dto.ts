import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CambiarContrasenaDto {
  @ApiProperty({ maxLength: 72, writeOnly: true })
  @IsString({ message: 'La contraseña actual es obligatoria' })
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria' })
  @MaxLength(72, {
    message: 'La contraseña no puede superar 72 caracteres',
  })
  contrasenaActual!: string;

  @ApiProperty({ minLength: 8, maxLength: 72, writeOnly: true })
  @IsString({ message: 'La nueva contraseña es obligatoria' })
  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, {
    message: 'La contraseña no puede superar 72 caracteres',
  })
  contrasenaNueva!: string;
}
