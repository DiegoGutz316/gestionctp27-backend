import { createZodDto } from 'nestjs-zod';
import { filtrarInsumosSchema } from '../../../schemas';

export class FiltrarInsumosDto extends createZodDto(filtrarInsumosSchema) {}
