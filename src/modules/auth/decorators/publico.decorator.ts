import { SetMetadata } from '@nestjs/common';

export const CLAVE_PUBLICO = 'esPublico';

/** Marca un endpoint como accesible sin token (por ejemplo, el login). */
export const Publico = () => SetMetadata(CLAVE_PUBLICO, true);
