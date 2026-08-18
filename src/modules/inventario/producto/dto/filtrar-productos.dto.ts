import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { TipoProducto } from '../enums/tipo-producto.enum';
import { Departamento } from '../enums/departamento.enum';
import { Ubicacion } from '../enums/ubicacion.enum';
import { OrdenProductos } from '../enums/orden-productos.enum';
import { PaginarDto } from '../../../../common/paginacion/dto/paginar.dto';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  return typeof valor === 'string' ? valor.trim() : valor;
}

export class FiltrarProductosDto extends OmitType(PaginarDto, ['q'] as const) {
  @ApiPropertyOptional({ minLength: 1, maxLength: 120 })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString({ message: 'Ingrese un texto de búsqueda' })
  @MinLength(1, { message: 'Ingrese un texto de búsqueda' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres' })
  nombre?: string;

  @ApiPropertyOptional({ enum: TipoProducto, enumName: 'TipoProducto' })
  @IsOptional()
  @IsEnum(TipoProducto, { message: 'Tipo de producto inválido' })
  tipoProducto?: TipoProducto;

  @ApiPropertyOptional({ enum: Departamento, enumName: 'Departamento' })
  @IsOptional()
  @IsEnum(Departamento, { message: 'Departamento inválido' })
  departamento?: Departamento;

  @ApiPropertyOptional({ enum: Ubicacion, enumName: 'Ubicacion' })
  @IsOptional()
  @IsEnum(Ubicacion, { message: 'Ubicación inválida' })
  ubicacion?: Ubicacion;

  /**
   * Backlog 4.7: "Ordenar insumos por categoría o nombre". La categoría del
   * enunciado es el `tipo_producto` de este modelo.
   */
  @ApiPropertyOptional({
    enum: OrdenProductos,
    enumName: 'OrdenProductos',
    default: OrdenProductos.NOMBRE,
  })
  @IsOptional()
  @IsEnum(OrdenProductos, { message: 'Orden inválido' })
  orden: OrdenProductos = OrdenProductos.NOMBRE;
}
