import { PartialType } from '@nestjs/swagger';

import { RegistrarCultivoDto } from './registrar-cultivo.dto';

/**
 * Todos los campos son opcionales: se envia solo lo que cambia. Las reglas de
 * cada uno (largo, tipo valido, descripcion) son las mismas del registro.
 */
export class EditarCultivoDto extends PartialType(RegistrarCultivoDto) {}
