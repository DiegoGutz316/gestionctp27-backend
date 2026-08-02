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

// ---------------------------------------------------------------------------
// Inventario e insumos (Feature 4)
// ---------------------------------------------------------------------------

export const UNIDADES_MEDIDA = [
  'kg',
  'g',
  'L',
  'mL',
  'unidad',
  'saco',
  'caja',
] as const;

export type UnidadMedida = (typeof UNIDADES_MEDIDA)[number];

// Los formularios envían los campos numéricos como string; z.coerce los
// convierte a number y el genérico <number | string> mantiene z.input tipado.
const numeroDesdeInput = (mensaje: string) =>
  z.coerce.number<number | string>({ error: mensaje });

export const crearCategoriaInsumoSchema = z.object({
  nombre: z
    .string({ error: 'El nombre de la categoría es obligatorio' })
    .trim()
    .min(1, 'El nombre de la categoría es obligatorio')
    .max(60, 'El nombre no puede superar 60 caracteres'),
});

export type CrearCategoriaInsumo = z.output<typeof crearCategoriaInsumoSchema>;

export const crearInsumoSchema = z.object({
  nombre: z
    .string({ error: 'El nombre del insumo es obligatorio' })
    .trim()
    .min(1, 'El nombre del insumo es obligatorio')
    .max(120, 'El nombre no puede superar 120 caracteres'),
  categoriaId: numeroDesdeInput('Seleccione una categoría')
    .int('Seleccione una categoría')
    .positive('Seleccione una categoría'),
  unidadMedida: z.enum(UNIDADES_MEDIDA, {
    error: 'Seleccione una unidad de medida válida',
  }),
  cantidad: numeroDesdeInput('La cantidad inicial es obligatoria').positive(
    'La cantidad inicial debe ser mayor que 0',
  ),
  nivelMinimo: numeroDesdeInput('El nivel mínimo es obligatorio').min(
    0,
    'El nivel mínimo debe ser 0 o mayor',
  ),
});

// Salida (números ya coercionados) y entrada (acepta string en los numéricos,
// útil para tipar formularios con react-hook-form).
export type CrearInsumo = z.output<typeof crearInsumoSchema>;
export type CrearInsumoInput = z.input<typeof crearInsumoSchema>;

// Esquemas de respuesta de la API (fechas serializadas como string ISO).
// Sufijo "Respuesta" para no chocar con las clases de entidad del backend.
export const categoriaInsumoSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  activo: z.boolean(),
  creadoEn: z.string(),
  actualizadoEn: z.string(),
});

export type CategoriaInsumoRespuesta = z.infer<typeof categoriaInsumoSchema>;

export const insumoSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  categoria: categoriaInsumoSchema,
  unidadMedida: z.enum(UNIDADES_MEDIDA),
  cantidad: z.number(),
  nivelMinimo: z.number(),
  activo: z.boolean(),
  creadoPor: z.string().nullable(),
  creadoEn: z.string(),
  actualizadoEn: z.string(),
});

export type InsumoRespuesta = z.infer<typeof insumoSchema>;
