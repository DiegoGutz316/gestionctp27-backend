import { createZodDto } from 'nestjs-zod';
import { crearInsumoSchema } from '../../../schemas';

export class CrearInsumoDto extends createZodDto(crearInsumoSchema) {}
