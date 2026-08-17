import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoProducto } from '../enums/tipo-producto.enum';
import { Departamento } from '../enums/departamento.enum';
import { Ubicacion } from '../enums/ubicacion.enum';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  return typeof valor === 'string' ? valor.trim() : valor;
}

export class FiltrarProductosDto {
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
}
