import { createZodDto } from 'nestjs-zod';
import { crearCategoriaInsumoSchema } from '../../../schemas';

export class CrearCategoriaInsumoDto extends createZodDto(
  crearCategoriaInsumoSchema,
) {}
