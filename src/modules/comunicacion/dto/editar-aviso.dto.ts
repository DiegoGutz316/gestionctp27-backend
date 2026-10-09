import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { CategoriaAviso } from '../enums/categoria-aviso.enum';
import { EstadoAviso } from '../enums/estado-aviso.enum';
import { EsFechaDeAviso } from './fecha-aviso.validator';

function normalizarTexto({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;

  const texto = value.trim();

  return texto === '' ? undefined : texto;
}

/**
 * Backlog 5.7: "El sistema permite actualizar título, descripción, fecha y
 * estado". El responsable de la modificación sale de la sesión.
 *
 * El orden de los decoradores deja el mensaje más básico al final, porque
 * class-validator devuelve los errores al revés y el frontend muestra el
 * primero.
 */
export class EditarAvisoDto {
  @ApiProperty({ maxLength: 150, example: 'Feria agrícola institucional' })
  @Transform(normalizarTexto)
  @MaxLength(150, { message: 'El título no puede superar 150 caracteres' })
  @MinLength(1, { message: 'El título es obligatorio' })
  @IsString({ message: 'El título es obligatorio' })
  @IsDefined({ message: 'El título es obligatorio' })
  titulo!: string;

  @ApiProperty({
    maxLength: 2000,
    example: 'Se realizará la feria anual en el gimnasio del colegio.',
  })
  @Transform(normalizarTexto)
  @MaxLength(2000, {
    message: 'La descripción no puede superar 2000 caracteres',
  })
  @MinLength(1, { message: 'La descripción es obligatoria' })
  @IsString({ message: 'La descripción es obligatoria' })
  @IsDefined({ message: 'La descripción es obligatoria' })
  descripcion!: string;

  @ApiProperty({
    enum: CategoriaAviso,
    enumName: 'CategoriaAviso',
    example: CategoriaAviso.EVENTOS,
  })
  @IsEnum(CategoriaAviso, { message: 'Seleccione una categoría válida' })
  @IsDefined({ message: 'La categoría es obligatoria' })
  categoria!: CategoriaAviso;

  @ApiProperty({ example: '2026-11-15', description: 'Fecha AAAA-MM-DD' })
  @Transform(normalizarTexto)
  @EsFechaDeAviso({ message: 'Ingrese una fecha válida (AAAA-MM-DD)' })
  @IsDefined({ message: 'La fecha del aviso es obligatoria' })
  fecha!: string;

  @ApiProperty({
    enum: EstadoAviso,
    enumName: 'EstadoAviso',
    example: EstadoAviso.ACTIVO,
  })
  @IsEnum(EstadoAviso, { message: 'Seleccione un estado válido' })
  @IsDefined({ message: 'El estado es obligatorio' })
  estado!: EstadoAviso;
}
