import { Transform, type TransformFnParams } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';

import { PaginarDto } from '../../../../common/paginacion/dto/paginar.dto';
import { EsFechaNoFutura } from '../../../../common/validacion/fecha-no-futura.validator';

function normalizarTexto({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;

  const texto = value.trim();

  return texto === '' ? undefined : texto;
}

/**
 * Backlog 3.7: "El sistema permite filtrar cosechas por cultivo o fecha".
 *
 * Los dos filtros son opcionales y se combinan.
 *
 * Hereda `pagina` y `limite` de `PaginarDto` pero omite `q`: este historial no
 * tiene busqueda por texto libre, se filtra por cultivo y por fecha. Sin
 * paginacion la consulta cargaria toda la historia, que solo crece.
 */
export class ConsultarCosechasDto extends OmitType(PaginarDto, ['q'] as const) {
  @ApiPropertyOptional({
    example: 'Tomate',
    description: 'Coincidencia parcial e insensible a mayúsculas',
  })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString({ message: 'Ingrese un cultivo válido' })
  @MinLength(1, { message: 'Ingrese un cultivo válido' })
  @MaxLength(120, { message: 'El filtro no puede superar 120 caracteres' })
  cultivo?: string;

  @ApiPropertyOptional({ example: '2026-09-17' })
  @Transform(normalizarTexto)
  @IsOptional()
  @EsFechaNoFutura({ message: 'Ingrese una fecha válida que no sea futura' })
  fecha?: string;
}
