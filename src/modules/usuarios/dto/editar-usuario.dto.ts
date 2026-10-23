import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RolUsuario } from '../enums/rol-usuario.enum';

export class EditarUsuarioDto {
  @ApiProperty({ minLength: 2, maxLength: 120 })
  @IsString({ message: 'El nombre es obligatorio' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres' })
  nombre!: string;

  @ApiProperty({ maxLength: 150, example: 'usuario@ctp27abril.ed.cr' })
  @IsString({ message: 'El correo es obligatorio' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  @MaxLength(150, { message: 'El correo no puede superar 150 caracteres' })
  @IsEmail({}, { message: 'Debe ingresar un correo válido' })
  correo!: string;

  @ApiPropertyOptional({
    minLength: 8,
    maxLength: 72,
    writeOnly: true,
    description:
      'Nueva contraseña. Si se omite, la contraseña actual se conserva.',
  })
  @IsOptional()
  @IsString({ message: 'La contraseña debe ser texto' })
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres',
  })
  @MaxLength(72, {
    message: 'La contraseña no puede superar 72 caracteres',
  })
  contrasena?: string;

  @ApiProperty({ enum: RolUsuario, enumName: 'RolUsuario' })
  @IsEnum(RolUsuario, { message: 'Seleccione un rol válido' })
  rol!: RolUsuario;

  @ApiProperty()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso' })
  activo!: boolean;
}
