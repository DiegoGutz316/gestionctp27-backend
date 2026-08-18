import { Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { transformarNumero } from './transformar-numero';
import { TieneDecimalesPermitidos } from './dos-decimales.validator';
import { VALOR_MAXIMO, VALOR_MAXIMO_TEXTO } from './limites-numericos';

// La cantidad no se edita directo: solo cambia registrando entradas/salidas
// (ver RegistrarEntradaDto/RegistrarSalidaDto), que quedan en el historial.
export class EditarInventarioDto {
  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: VALOR_MAXIMO })
  @Transform(transformarNumero)
  @IsOptional()
  @IsNumber({}, { message: 'El stock mínimo debe ser un número válido' })
  @TieneDecimalesPermitidos({
    message: 'El stock mínimo admite como máximo 2 decimales',
  })
  @Min(0, { message: 'El stock mínimo debe ser 0 o mayor' })
  @Max(VALOR_MAXIMO, {
    message: `El stock mínimo no puede superar ${VALOR_MAXIMO_TEXTO}`,
  })
  stockMinimo?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0, maximum: VALOR_MAXIMO })
  @Transform(transformarNumero)
  @IsOptional()
  @IsNumber({}, { message: 'El precio debe ser un número válido' })
  @TieneDecimalesPermitidos({
    message: 'El precio admite como máximo 2 decimales',
  })
  @Min(0, { message: 'El precio debe ser 0 o mayor' })
  @Max(VALOR_MAXIMO, {
    message: `El precio no puede superar ${VALOR_MAXIMO_TEXTO}`,
  })
  precio?: number;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser booleano' })
  activo?: boolean;
}
