import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { EstadoAviso } from '../enums/estado-aviso.enum';
import { EsFechaDeAviso } from './fecha-aviso.validator';

function normalizarTexto({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;

  const texto = value.trim();

  return texto === '' ? undefined : texto;
}

/**
 * Backlog 5.5: "El sistema permite ingresar titulo, descripcion, fecha y
 * estado del aviso" y "Los campos obligatorios se validan antes de publicar".
 *
 * El autor no viaja en el cuerpo: sale de la sesion.
 *
 * Ojo con el orden de los decoradores: class-validator devuelve los errores
 * en orden inverso al de declaracion y el frontend muestra el primero, asi
 * que el mensaje mas basico se declara al final.
 */
export class RegistrarAvisoDto {
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

  /**
   * Se admiten fechas futuras a proposito: un aviso anuncia algo que todavia
   * no ocurrio.
   */
  @ApiProperty({ example: '2026-11-15', description: 'Fecha AAAA-MM-DD' })
  @Transform(normalizarTexto)
  @EsFechaDeAviso({ message: 'Ingrese una fecha válida (AAAA-MM-DD)' })
  @IsDefined({ message: 'La fecha del aviso es obligatoria' })
  fecha!: string;

  /**
   * Opcional: un aviso recien publicado nace activo, que es lo que espera el
   * criterio "el aviso activo queda disponible para consulta". Se acepta
   * explicito para poder dejarlo preparado sin publicarlo todavia.
   */
  @ApiPropertyOptional({
    enum: EstadoAviso,
    enumName: 'EstadoAviso',
    example: EstadoAviso.ACTIVO,
    description: 'Opcional. Si no viene, el aviso se publica como ACTIVO',
  })
  @IsOptional()
  @IsEnum(EstadoAviso, { message: 'Seleccione un estado válido' })
  estado?: EstadoAviso;
}
