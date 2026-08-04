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

// ---------------------------------------------------------------------------
// Autenticación (Backlog 1.1 / 1.6)
// Adaptado desde _entrega-1.1/src/schemas/auth.fragmento.ts: el fragmento usa
// `required_error` (API de Zod v3); este repo tiene Zod v4.4.3, que usa
// `{ error: '...' }` como el resto de este archivo (ver crearCategoriaInsumoSchema).
// ---------------------------------------------------------------------------

/**
 * Roles del sistema (Backlog 1.6).
 * Fuente única de verdad: la entidad Usuario, el enum de PostgreSQL, los
 * guards del backend y el menú del frontend se derivan de esta constante.
 */
export const ROLES_USUARIO = [
  'ADMINISTRADOR',
  'DIRECTORA',
  'DOCENTE_PECUARIO',
  'DOCENTE_AGRICOLA',
  'ESTUDIANTE',
] as const;

export type RolUsuario = (typeof ROLES_USUARIO)[number];

export const rolUsuarioSchema = z.enum(ROLES_USUARIO);

/** Etiquetas legibles para mostrar en pantalla. */
export const ETIQUETA_ROL: Record<RolUsuario, string> = {
  ADMINISTRADOR: 'Administrador',
  DIRECTORA: 'Dirección',
  DOCENTE_PECUARIO: 'Docente pecuario',
  DOCENTE_AGRICOLA: 'Docente agrícola',
  ESTUDIANTE: 'Estudiante',
};

/** Entrada del login (Backlog 1.1). */
export const loginSchema = z.object({
  correo: z
    .string({ error: 'El correo es obligatorio.' })
    .trim()
    .toLowerCase()
    .max(150)
    .email('El correo no tiene un formato válido.'),
  contrasena: z
    .string({ error: 'La contraseña es obligatoria.' })
    .min(1, 'La contraseña es obligatoria.')
    .max(72), // límite propio de bcrypt
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Datos públicos del usuario en sesión. Nunca incluye el hash. */
export const usuarioSesionSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  correo: z.string().email(),
  rol: rolUsuarioSchema,
});

export type UsuarioSesion = z.infer<typeof usuarioSesionSchema>;

/** Respuesta del endpoint POST /api/auth/login. */
export const respuestaLoginSchema = z.object({
  accessToken: z.string(),
  expiraEn: z.string(),
  usuario: usuarioSesionSchema,
});

export type RespuestaLogin = z.infer<typeof respuestaLoginSchema>;
