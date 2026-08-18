import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsNumber,
  IsPositive,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { transformarNumero } from './transformar-numero';
import { TieneDecimalesPermitidos } from './dos-decimales.validator';
import { VALOR_MAXIMO, VALOR_MAXIMO_TEXTO } from './limites-numericos';

// La cantidad no se fija al crear: el lote nace en 0 y solo cambia
// registrando entradas/salidas (ver RegistrarEntradaDto/RegistrarSalidaDto).
export class CrearInventarioDto {
  @ApiProperty({ type: Number, minimum: 1 })
  @Transform(transformarNumero)
  @IsDefined({ message: 'Seleccione un producto' })
  @IsInt({ message: 'Seleccione un producto' })
  @IsPositive({ message: 'Seleccione un producto' })
  productoId!: number;

  @ApiProperty({ type: Number, minimum: 0, maximum: VALOR_MAXIMO })
  @Transform(transformarNumero)
  @IsDefined({ message: 'El stock mínimo es obligatorio' })
  @IsNumber({}, { message: 'El stock mínimo debe ser un número válido' })
  @TieneDecimalesPermitidos({
    message: 'El stock mínimo admite como máximo 2 decimales',
  })
  @Min(0, { message: 'El stock mínimo debe ser 0 o mayor' })
  @Max(VALOR_MAXIMO, {
    message: `El stock mínimo no puede superar ${VALOR_MAXIMO_TEXTO}`,
  })
  stockMinimo!: number;

  @ApiProperty({ type: Number, minimum: 0, maximum: VALOR_MAXIMO })
  @Transform(transformarNumero)
  @IsDefined({ message: 'El precio es obligatorio' })
  @IsNumber({}, { message: 'El precio debe ser un número válido' })
  @TieneDecimalesPermitidos({
    message: 'El precio admite como máximo 2 decimales',
  })
  @Min(0, { message: 'El precio debe ser 0 o mayor' })
  @Max(VALOR_MAXIMO, {
    message: `El precio no puede superar ${VALOR_MAXIMO_TEXTO}`,
  })
  precio!: number;
}
