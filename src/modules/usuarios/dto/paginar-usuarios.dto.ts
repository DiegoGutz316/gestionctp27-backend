import { Transform, type TransformFnParams } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { PaginarDto } from '../../../common/paginacion/dto/paginar.dto';
import { RolUsuario } from '../enums/rol-usuario.enum';

function transformarBoolean({ value }: TransformFnParams): unknown {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}

/**
 * Query de GET /usuarios: paginación + filtros.
 * - q: busca por nombre o correo
 * - rol / activo: filtros exactos
 * - order: ASC | DESC sobre el nombre
 */
export class PaginarUsuariosDto extends PaginarDto {
  @ApiPropertyOptional({ enum: RolUsuario, enumName: 'RolUsuario' })
  @IsOptional()
  @IsEnum(RolUsuario, { message: 'Seleccione un rol válido' })
  rol?: RolUsuario;

  @ApiPropertyOptional({
    description: 'Filtrar por usuarios activos o inactivos',
  })
  @Transform(transformarBoolean)
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso' })
  activo?: boolean;

  @ApiPropertyOptional({
    enum: ['ASC', 'DESC'],
    default: 'ASC',
    description: 'Orden por nombre',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'], { message: 'El orden debe ser ASC o DESC' })
  order: 'ASC' | 'DESC' = 'ASC';
}
