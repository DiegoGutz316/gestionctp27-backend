import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';

import { PaginarDto } from '../../../../common/paginacion/dto/paginar.dto';
import { EsFechaNoFutura } from '../../../../common/validacion/fecha-no-futura.validator';

import {
  FechaExclusivaDelRango,
  RangoFechasValido,
} from './rango-fechas.validator';

function transformarNumero({ value }: TransformFnParams): unknown {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || value.trim() === '') return undefined;

  return Number(value);
}

function normalizarTexto({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;

  const texto = value.trim();

  return texto === '' ? undefined : texto;
}

/**
 * Backlog 3.7: "El sistema permite filtrar cosechas por cultivo o fecha".
 *
 * Los filtros son opcionales y se combinan.
 *
 * La fecha se filtra por rango y no por un dia exacto: un historial de
 * produccion se consulta por periodos ("lo cosechado en setiembre"), y un dia
 * suelto sigue siendo posible poniendo el mismo valor en los dos extremos.
 * Mismo par `desde`/`hasta` que usan movimientos de inventario y produccion
 * pecuaria.
 *
 * `fecha`, el filtro de un dia que habia antes, sigue aceptandose. El pipe
 * global usa `forbidNonWhitelisted`, asi que quitarlo devolvia 400 a quien lo
 * mandara, y backend y frontend se despliegan por separado: entre un
 * despliegue y otro el frontend ya publicado lo sigue enviando.
 *
 * Hereda `pagina` y `limite` de `PaginarDto` pero omite `q`: este historial no
 * tiene busqueda por texto libre. Sin paginacion la consulta cargaria toda la
 * historia, que solo crece.
 */
@RangoFechasValido()
@FechaExclusivaDelRango()
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

  /**
   * Se filtra por id y no por el codigo "CAMA-001": un id no admite variantes
   * de escritura, que es justo el problema que tiene el filtro de cultivo.
   */
  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    example: 1,
    description: 'Id de la cama de cultivo donde se hizo la cosecha',
  })
  @Transform(transformarNumero)
  @IsOptional()
  @IsPositive({ message: 'Seleccione una cama de cultivo válida' })
  @IsInt({ message: 'Seleccione una cama de cultivo válida' })
  camaId?: number;

  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'Incluye las cosechas de esta fecha en adelante',
  })
  @Transform(normalizarTexto)
  @IsOptional()
  @EsFechaNoFutura({
    message: 'Ingrese una fecha inicial válida que no sea futura',
  })
  desde?: string;

  @ApiPropertyOptional({
    example: '2026-09-30',
    description: 'Incluye las cosechas hasta esta fecha',
  })
  @Transform(normalizarTexto)
  @IsOptional()
  @EsFechaNoFutura({
    message: 'Ingrese una fecha final válida que no sea futura',
  })
  hasta?: string;

  /**
   * @deprecated Use `desde` y `hasta`. Equivale a un rango de un solo dia y se
   * mantiene para no romper a los clientes ya desplegados.
   */
  @ApiPropertyOptional({
    example: '2026-09-18',
    deprecated: true,
    description: 'Obsoleto: filtra un solo día. Use «desde» y «hasta»',
  })
  @Transform(normalizarTexto)
  @IsOptional()
  @EsFechaNoFutura({ message: 'Ingrese una fecha válida que no sea futura' })
  fecha?: string;
}
