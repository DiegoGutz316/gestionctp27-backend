import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RolUsuario } from '../enums/rol-usuario.enum';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  return typeof valor === 'string' ? valor.trim() : valor;
}

export type ColumnaOrden = 'nombre' | 'activo';
export type DireccionOrden = 'ASC' | 'DESC';

export class ConsultarUsuariosDto {
  /** Coincide por nombre, correo o la etiqueta legible del rol (p. ej. "Docente pecuario"). */
  @ApiPropertyOptional({ minLength: 1, maxLength: 150 })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString({ message: 'Ingrese un texto de búsqueda' })
  @MinLength(1, { message: 'Ingrese un texto de búsqueda' })
  @MaxLength(150, { message: 'La búsqueda no puede superar 150 caracteres' })
  busqueda?: string;

  /** Filtro exacto por rol, independiente de `busqueda`. */
  @ApiPropertyOptional({ enum: RolUsuario, enumName: 'RolUsuario' })
  @IsOptional()
  @IsEnum(RolUsuario, { message: 'Seleccione un rol válido' })
  rol?: RolUsuario;

  @ApiPropertyOptional({ enum: ['nombre', 'activo'], default: 'nombre' })
  @IsOptional()
  @IsIn(['nombre', 'activo'], {
    message: 'Solo se puede ordenar por nombre o estado (activo)',
  })
  ordenarPor: ColumnaOrden = 'nombre';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'ASC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'], { message: 'El orden debe ser ASC o DESC' })
  orden: DireccionOrden = 'ASC';
}
