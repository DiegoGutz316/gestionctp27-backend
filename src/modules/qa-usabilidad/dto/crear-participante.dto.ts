import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

function trim({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

const ROLES = [
  'DOCENTE_PECUARIO',
  'DOCENTE_AGRICOLA',
  'DIRECTORA',
  'OTRO',
] as const;

export class CrearParticipanteDto {
  @ApiProperty({ example: 'DOC-01' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'El código del participante es obligatorio' })
  @MaxLength(40)
  @Matches(/^[A-Z0-9][A-Z0-9\-_]{1,38}$/i, {
    message: 'Use un código anónimo tipo DOC-01 o DIR-01',
  })
  codigo!: string;

  @ApiProperty({ enum: ROLES })
  @IsIn(ROLES, { message: 'Seleccione un rol de perfil válido' })
  rolPerfil!: (typeof ROLES)[number];

  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(250)
  notas?: string;
}
