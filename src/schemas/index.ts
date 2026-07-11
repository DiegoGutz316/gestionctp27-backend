import { z } from 'zod';

/**
 * Esquemas Zod de validación del backend.
 *
 * IMPORTANTE: estos esquemas deben mantenerse sincronizados manualmente con
 * los del repositorio del frontend (gestionctp27-frontend, src/schemas/).
 * Regla práctica: cualquier cambio a un esquema se hace en ambos repos en el
 * mismo día/PR.
 */

// Esquema placeholder — reemplazar/ampliar cuando se implementen las features.
export const healthCheckSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
});

export type HealthCheck = z.infer<typeof healthCheckSchema>;
