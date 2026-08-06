import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RolUsuario } from '../enums/rol-usuario.enum';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  return typeof valor === 'string' ? valor.trim() : valor;
}

function transformarBoolean({ value }: TransformFnParams): unknown {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}

export class FiltrarUsuariosDto {
  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 150,
    description: 'Busca por nombre o correo',
  })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString({ message: 'Ingrese un texto de búsqueda' })
  @MinLength(1, { message: 'Ingrese un texto de búsqueda' })
  @MaxLength(150, { message: 'La búsqueda no puede superar 150 caracteres' })
  busqueda?: string;

  @ApiPropertyOptional({ enum: RolUsuario, enumName: 'RolUsuario' })
  @IsOptional()
  @IsEnum(RolUsuario, { message: 'Seleccione un rol válido' })
  rol?: RolUsuario;

  @ApiPropertyOptional()
  @Transform(transformarBoolean)
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso' })
  activo?: boolean;
}
