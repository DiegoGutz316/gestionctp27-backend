import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { TipoCultivo } from '../enums/tipo-cultivo.enum';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;

  return typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : valor;
}

/** Al editar, la descripcion vacia borra la que habia. */
function normalizarDescripcion({ value }: TransformFnParams): unknown {
  const valor: unknown = value;

  if (typeof valor !== 'string') return valor;

  const texto = valor.trim();

  return texto === '' ? null : texto;
}

/**
 * Valida el campo solo si viene en la peticion.
 *
 * Se usa en lugar de `@IsOptional()`, que ademas de `undefined` deja pasar
 * `null` sin aplicar ninguna regla: asi un `{"nombre": null}` llegaba hasta el
 * servicio y terminaba en un 500. Con esto, el campo ausente se ignora y el
 * `null` explicito se valida como cualquier otro valor.
 */
function SeEnvia(): PropertyDecorator {
  return ValidateIf((_objeto: unknown, valor: unknown) => valor !== undefined);
}

/**
 * Se envia solo lo que cambia: lo que no viene, no se toca. Las reglas de cada
 * campo son las mismas del registro.
 */
export class EditarCultivoDto {
  @ApiPropertyOptional({ example: 'Lechuga', maxLength: 120 })
  @Transform(normalizarTexto)
  @SeEnvia()
  @MaxLength(120, {
    message: 'El nombre no puede superar 120 caracteres',
  })
  @MinLength(2, { message: 'El nombre del cultivo es obligatorio' })
  @IsString({ message: 'El nombre del cultivo es obligatorio' })
  nombre?: string;

  @ApiPropertyOptional({
    enum: TipoCultivo,
    enumName: 'TipoCultivo',
    example: TipoCultivo.HORTALIZA,
  })
  @SeEnvia()
  @IsEnum(TipoCultivo, { message: 'Seleccione un tipo de cultivo válido' })
  tipo?: TipoCultivo;

  /**
   * `null`, o el texto vacio, borran la descripcion. Omitir el campo deja la
   * que ya estaba.
   */
  @ApiPropertyOptional({
    example: 'Variedad de hoja suelta, ciclo de 45 días.',
    maxLength: 500,
    nullable: true,
  })
  @Transform(normalizarDescripcion)
  @IsOptional()
  @MaxLength(500, {
    message: 'La descripción no puede superar 500 caracteres',
  })
  @IsString({ message: 'La descripción debe ser texto' })
  descripcion?: string | null;

  @ApiPropertyOptional({
    description: 'Un cultivo inactivo deja de ofrecerse al sembrar',
  })
  @SeEnvia()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso' })
  activo?: boolean;
}
