import { createZodDto } from 'nestjs-zod';
import { crearUsuarioSchema } from '../../../schemas';

export class CrearUsuarioDto extends createZodDto(crearUsuarioSchema) {}
