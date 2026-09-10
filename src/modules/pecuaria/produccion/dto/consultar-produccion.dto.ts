import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { TipoProduccion } from '../enums/tipo-produccion.enum';
import { EsFechaIsoProduccion } from './fecha-produccion.validator';
import { transformarNumero } from './transformar-numero';

export class ConsultarProduccionDto {
  @ApiProperty({
    type: Number,
    minimum: 1,
    example: 1,
    description: 'Identificador del animal',
  })
  @Transform(transformarNumero)
  @IsDefined({ message: 'Seleccione un animal' })
  @IsInt({ message: 'Seleccione un animal válido' })
  @IsPositive({ message: 'Seleccione un animal válido' })
  animalId!: number;

  @ApiPropertyOptional({
    example: '2026-09-01',
    description: 'Incluye la producción de esta fecha en adelante',
  })
  @IsOptional()
  @EsFechaIsoProduccion()
  desde?: string;

  @ApiPropertyOptional({
    enum: TipoProduccion,
    enumName: 'TipoProduccion',
  })
  @IsOptional()
  @IsEnum(TipoProduccion, {
    message: 'Seleccione un tipo de producción válido',
  })
  tipoProduccion?: TipoProduccion;
}
