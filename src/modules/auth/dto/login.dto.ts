import { createZodDto } from 'nestjs-zod';
import { loginSchema } from '../../../schemas';

/**
 * DTO derivado del schema Zod compartido con el frontend.
 * Mantener una sola definicion evita que las validaciones de las dos capas
 * se desincronicen.
 */
export class LoginDto extends createZodDto(loginSchema) {}
