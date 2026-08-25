import { Transform, type TransformFnParams } from 'class-transformer';
import { IsDefined, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EsFechaIso, RangoPeriodoValido } from './fecha-periodo.validator';

function normalizarTexto({ value }: TransformFnParams): unknown {
  const valor: unknown = value;
  return typeof valor === 'string' ? valor.trim() : valor;
}

@RangoPeriodoValido()
export class EditarPeriodoDto {
  @ApiProperty({ minLength: 1, maxLength: 120 })
  @Transform(normalizarTexto)
  @IsString({ message: 'El nombre del periodo es obligatorio' })
  @IsNotEmpty({ message: 'El nombre del periodo es obligatorio' })
  @MaxLength(120, {
    message: 'El nombre del periodo no puede superar 120 caracteres',
  })
  nombre!: string;

  @ApiProperty({ example: '2026-02-01' })
  @IsDefined({ message: 'La fecha de inicio es obligatoria' })
  @EsFechaIso()
  fechaInicio!: string;

  @ApiProperty({ example: '2026-07-31' })
  @IsDefined({ message: 'La fecha de fin es obligatoria' })
  @EsFechaIso()
  fechaFin!: string;
}
