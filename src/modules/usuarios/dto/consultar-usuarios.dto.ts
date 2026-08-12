import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
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

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero' })
  @Min(1, { message: 'La página mínima es 1' })
  pagina: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite mínimo es 1' })
  @Max(100, { message: 'El límite máximo es 100' })
  limite: number = 20;
}
