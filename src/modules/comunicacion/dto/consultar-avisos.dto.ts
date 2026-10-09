import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { PaginarDto } from '../../../common/paginacion/dto/paginar.dto';

import { CategoriaAviso } from '../enums/categoria-aviso.enum';
import { EstadoAviso } from '../enums/estado-aviso.enum';

/**
 * Backlog 5.6: quien tiene lectura ve solo avisos activos.
 *
 * `estado` e `q` los usa el panel administrativo. El servicio ignora un
 * pedido de inactivos si el rol no tiene permiso completo, para que la
 * lectura general no los reciba.
 */
export class ConsultarAvisosDto extends OmitType(PaginarDto, ['q'] as const) {
  @ApiPropertyOptional({
    enum: [EstadoAviso.ACTIVO, EstadoAviso.INACTIVO, 'TODOS'],
    description:
      'ACTIVO es el valor por defecto. INACTIVO y TODOS solo aplican con permiso completo.',
  })
  @IsOptional()
  @IsIn([EstadoAviso.ACTIVO, EstadoAviso.INACTIVO, 'TODOS'], {
    message: 'Seleccione un estado válido',
  })
  estado?: EstadoAviso | 'TODOS';

  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 150,
    description: 'Busca por título del aviso',
  })
  @IsOptional()
  @IsString({ message: 'Ingrese un texto de búsqueda' })
  @MinLength(1, { message: 'Ingrese un texto de búsqueda' })
  @MaxLength(150, { message: 'La búsqueda no puede superar 150 caracteres' })
  q?: string;

  @ApiPropertyOptional({
    enum: CategoriaAviso,
    enumName: 'CategoriaAviso',
    description:
      'La página pública filtra por categoría antes de paginar. Sin este valor se incluyen también los avisos que aún no tienen categoría.',
  })
  @IsOptional()
  @IsEnum(CategoriaAviso, { message: 'Seleccione una categoría válida' })
  categoria?: CategoriaAviso;
}
