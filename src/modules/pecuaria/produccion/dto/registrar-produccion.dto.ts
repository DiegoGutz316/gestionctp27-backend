import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsInt,
  IsNumber,
  IsPositive,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { TipoProduccion } from '../enums/tipo-produccion.enum';
import { TieneDecimalesPermitidos } from './dos-decimales.validator';
import { EsFechaProduccion } from './fecha-produccion.validator';
import { VALOR_MAXIMO, VALOR_MAXIMO_TEXTO } from './limites-numericos';
import { transformarNumero } from './transformar-numero';

export class RegistrarProduccionDto {
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

  @ApiProperty({
    enum: TipoProduccion,
    enumName: 'TipoProduccion',
    example: TipoProduccion.LECHE,
  })
  @IsEnum(TipoProduccion, {
    message: 'Seleccione un tipo de producción válido',
  })
  tipoProduccion!: TipoProduccion;

  @ApiProperty({
    type: Number,
    minimum: 0,
    exclusiveMinimum: true,
    maximum: VALOR_MAXIMO,
    example: 12.5,
    description: 'Cantidad producida; debe ser mayor a cero',
  })
  @Transform(transformarNumero)
  @IsDefined({ message: 'La cantidad es obligatoria' })
  @IsNumber({}, { message: 'La cantidad debe ser un número válido' })
  @TieneDecimalesPermitidos({
    message: 'La cantidad admite como máximo 2 decimales',
  })
  @IsPositive({ message: 'La cantidad debe ser mayor a cero' })
  @Max(VALOR_MAXIMO, {
    message: `La cantidad no puede superar ${VALOR_MAXIMO_TEXTO}`,
  })
  cantidad!: number;

  @ApiProperty({
    example: '2026-09-08',
    description: 'Fecha de la producción (AAAA-MM-DD)',
  })
  @IsDefined({ message: 'La fecha de producción es obligatoria' })
  @EsFechaProduccion()
  fecha!: string;
}
