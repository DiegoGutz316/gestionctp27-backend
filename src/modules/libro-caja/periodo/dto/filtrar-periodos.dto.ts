import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginarDto } from '../../../../common/paginacion/dto/paginar.dto';
import { EstadoPeriodo } from '../enums/estado-periodo.enum';

export class FiltrarPeriodosDto extends PaginarDto {
  @ApiPropertyOptional({ enum: EstadoPeriodo, enumName: 'EstadoPeriodo' })
  @IsOptional()
  @IsEnum(EstadoPeriodo, { message: 'Estado de periodo inválido' })
  estado?: EstadoPeriodo;
}
