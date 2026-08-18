import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoProducto } from '../enums/tipo-producto.enum';
import { UnidadMedida } from '../enums/unidad-medida.enum';
import { Departamento } from '../enums/departamento.enum';
import { Ubicacion } from '../enums/ubicacion.enum';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  return typeof valor === 'string' ? valor.trim() : valor;
}

export class EditarProductoDto {
  @ApiProperty({ minLength: 1, maxLength: 120 })
  @Transform(normalizarTexto)
  @IsString({ message: 'El nombre del producto es obligatorio' })
  @IsNotEmpty({ message: 'El nombre del producto es obligatorio' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres' })
  nombre!: string;

  @ApiProperty({ enum: TipoProducto, enumName: 'TipoProducto' })
  @IsEnum(TipoProducto, { message: 'Seleccione un tipo de producto válido' })
  tipoProducto!: TipoProducto;

  @ApiProperty({ enum: UnidadMedida, enumName: 'UnidadMedida' })
  @IsEnum(UnidadMedida, { message: 'Seleccione una unidad de medida válida' })
  unidadMedida!: UnidadMedida;

  @ApiProperty({ enum: Departamento, enumName: 'Departamento' })
  @IsEnum(Departamento, { message: 'Seleccione un departamento válido' })
  departamento!: Departamento;

  @ApiProperty({ enum: Ubicacion, enumName: 'Ubicacion' })
  @IsEnum(Ubicacion, { message: 'Seleccione una ubicación válida' })
  ubicacion!: Ubicacion;
}
