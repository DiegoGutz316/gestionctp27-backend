import { createZodDto } from 'nestjs-zod';
import { editarInsumoSchema } from '../../../schemas';

export class EditarInsumoDto extends createZodDto(editarInsumoSchema) {}
