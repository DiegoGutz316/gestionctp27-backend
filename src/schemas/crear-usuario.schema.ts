import { z } from 'zod';

export const crearUsuarioSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, {
      error: 'El nombre debe tener al menos 2 caracteres',
    })
    .max(100, {
      error: 'El nombre no puede superar los 100 caracteres',
    }),

  correo: z.preprocess(
    (valor) => (typeof valor === 'string' ? valor.trim().toLowerCase() : valor),
    z.email({
      error: 'Debe ingresar un correo válido',
    }),
  ),

  contrasena: z
    .string()
    .min(8, {
      error: 'La contraseña debe tener al menos 8 caracteres',
    })
    .max(72, {
      error: 'La contraseña no puede superar los 72 caracteres',
    }),

  rolId: z
    .number()
    .int('El identificador del rol debe ser un número entero')
    .positive('El identificador del rol debe ser mayor que cero'),

  activo: z.boolean().optional().default(true),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
