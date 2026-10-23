import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GuardarPieInformeDto {
  @ApiProperty({ type: [String], minItems: 3, maxItems: 3 })
  @IsArray({ message: 'Indique las tres observaciones del informe' })
  @ArrayMinSize(3, { message: 'Indique las tres observaciones del informe' })
  @ArrayMaxSize(3, { message: 'El informe admite tres observaciones' })
  @IsString({ each: true, message: 'Cada observación debe ser texto' })
  @MaxLength(300, {
    each: true,
    message: 'Cada observación no puede superar 300 caracteres',
  })
  @Type(() => String)
  observaciones!: [string, string, string];

  @ApiProperty()
  @IsString({ message: 'El nombre del director debe ser texto' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres' })
  director!: string;

  @ApiProperty()
  @IsString({ message: 'El nombre del presidente debe ser texto' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres' })
  presidente!: string;

  @ApiProperty()
  @IsString({ message: 'El nombre de la tesorera debe ser texto' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres' })
  tesorera!: string;

  @ApiProperty()
  @IsString({ message: 'La firma del director debe ser texto' })
  @MaxLength(120, { message: 'La firma no puede superar 120 caracteres' })
  firmaDirector!: string;

  @ApiProperty()
  @IsString({ message: 'La firma del presidente debe ser texto' })
  @MaxLength(120, { message: 'La firma no puede superar 120 caracteres' })
  firmaPresidente!: string;

  @ApiProperty()
  @IsString({ message: 'La firma de la tesorera debe ser texto' })
  @MaxLength(120, { message: 'La firma no puede superar 120 caracteres' })
  firmaTesorera!: string;

  @ApiProperty()
  @IsString({ message: 'El nombre del coordinador debe ser texto' })
  @MaxLength(120, { message: 'El nombre no puede superar 120 caracteres' })
  coordinador!: string;
}
