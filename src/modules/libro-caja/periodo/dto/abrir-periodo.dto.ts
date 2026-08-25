import { Transform, Type, type TransformFnParams } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EsFechaIso, RangoPeriodoValido } from './fecha-periodo.validator';
import { FondoInicialDto } from './fondo-inicial.dto';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  return typeof valor === 'string' ? valor.trim() : valor;
}

@RangoPeriodoValido()
export class AbrirPeriodoDto {
  @ApiProperty({
    minLength: 1,
    maxLength: 120,
    example: 'I semestre 2026',
  })
  @Transform(normalizarTexto)
  @IsString({ message: 'El nombre del periodo es obligatorio' })
  @IsNotEmpty({ message: 'El nombre del periodo es obligatorio' })
  @MaxLength(120, {
    message: 'El nombre del periodo no puede superar 120 caracteres',
  })
  nombre!: string;

  @ApiProperty({ example: '2026-02-01', description: 'Inicio del periodo' })
  @IsDefined({ message: 'La fecha de inicio es obligatoria' })
  @EsFechaIso()
  fechaInicio!: string;

  @ApiProperty({ example: '2026-07-31', description: 'Fin del periodo' })
  @IsDefined({ message: 'La fecha de fin es obligatoria' })
  @EsFechaIso()
  fechaFin!: string;

  @ApiProperty({
    type: [FondoInicialDto],
    description:
      'Fondo de cada departamento activo: saldo que queda de periodos anteriores, escrito a mano.',
  })
  @IsDefined({ message: 'Debe indicar el fondo de cada departamento' })
  @IsArray({ message: 'Debe indicar el fondo de cada departamento' })
  @ArrayMinSize(1, {
    message: 'Debe indicar el fondo de cada departamento',
  })
  @ValidateNested({ each: true })
  @Type(() => FondoInicialDto)
  fondos!: FondoInicialDto[];
}
