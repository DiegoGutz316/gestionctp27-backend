import { Transform, type TransformFnParams } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginarDto } from '../../../../common/paginacion/dto/paginar.dto';

function transformarBoolean({ value }: TransformFnParams): unknown {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  return typeof valor === 'string' ? valor.trim() : valor;
}

export class FiltrarDepartamentosDto extends PaginarDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @Transform(normalizarTexto)
  @IsOptional()
  @IsString({ message: 'El tipo de actividad debe ser un texto' })
  @MaxLength(120, {
    message: 'El tipo de actividad no puede superar 120 caracteres',
  })
  tipoActividad?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por departamentos activos o inactivos',
  })
  @Transform(transformarBoolean)
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso' })
  activo?: boolean;
}
