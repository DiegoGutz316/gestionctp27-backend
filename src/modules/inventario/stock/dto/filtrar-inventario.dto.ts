import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { transformarNumero } from './transformar-numero';
import { PaginarDto } from '../../../../common/paginacion/dto/paginar.dto';
import { Departamento } from '../../producto/enums/departamento.enum';

export class FiltrarInventarioDto extends OmitType(PaginarDto, ['q'] as const) {
  @ApiPropertyOptional({ type: Number, minimum: 1 })
  @Transform(transformarNumero)
  @IsOptional()
  @IsInt({ message: 'Producto inválido' })
  @IsPositive({ message: 'Producto inválido' })
  productoId?: number;

  @ApiPropertyOptional({ enum: Departamento, enumName: 'Departamento' })
  @IsOptional()
  @IsEnum(Departamento, { message: 'Departamento inválido' })
  departamento?: Departamento;
}
