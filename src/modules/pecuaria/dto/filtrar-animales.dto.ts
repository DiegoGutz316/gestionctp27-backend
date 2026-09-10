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
import { OrdenAnimales } from '../enums/orden-animales.enum';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  return typeof valor === 'string' ? valor.trim() : valor;
}

/** Los query params llegan como texto: "true"/"false" no son booleanos. */
function aBooleano({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  if (typeof valor === 'boolean') return valor;
  if (valor === 'true') return true;
  if (valor === 'false') return false;
  return valor;
}

export class FiltrarAnimalesDto {
  /**
   * Backlog 2.2: "El sistema permite buscar animales por código, nombre o
   * estado". Es una sola búsqueda que compara contra los tres campos, tal como
   * está redactado el criterio, en vez de tres filtros separados.
   */
  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 120,
    description: 'Busca en código, nombre o estado',
  })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString({ message: 'Ingrese un texto de búsqueda' })
  @MinLength(1, { message: 'Ingrese un texto de búsqueda' })
  @MaxLength(120, { message: 'La búsqueda no puede superar 120 caracteres' })
  q?: string;

  /**
   * El criterio pide listar los animales **activos**, así que por defecto se
   * omiten los dados de baja. Este interruptor permite verlos cuando hace falta
   * consultar el historial.
   */
  @ApiPropertyOptional({ type: Boolean, default: false })
  @Transform(aBooleano)
  @IsOptional()
  @IsBoolean({ message: 'El valor debe ser verdadero o falso' })
  incluirInactivos: boolean = false;

  @ApiPropertyOptional({
    enum: OrdenAnimales,
    enumName: 'OrdenAnimales',
    default: OrdenAnimales.NOMBRE,
  })
  @IsOptional()
  @IsEnum(OrdenAnimales, { message: 'Orden inválido' })
  orden: OrdenAnimales = OrdenAnimales.NOMBRE;
}
