/**
 * Labor registrada sobre una siembra.
 *
 * Un unico formulario cubre las cuatro labores habituales de la huerta. Las
 * dos primeras no gastan producto; las dos ultimas si, y por eso el producto
 * y la cantidad solo se exigen en esas.
 */
export enum ActividadAgricola {
  RIEGO = 'RIEGO',
  LIMPIEZA = 'LIMPIEZA',
  FERTILIZACION = 'FERTILIZACION',
  TRATAMIENTO = 'TRATAMIENTO',
}

/** Las labores en las que se aplica un producto. */
export const ACTIVIDADES_CON_PRODUCTO: ActividadAgricola[] = [
  ActividadAgricola.FERTILIZACION,
  ActividadAgricola.TRATAMIENTO,
];

export function usaProducto(actividad: ActividadAgricola): boolean {
  return ACTIVIDADES_CON_PRODUCTO.includes(actividad);
}

export const ETIQUETA_ACTIVIDAD: Record<ActividadAgricola, string> = {
  [ActividadAgricola.RIEGO]: 'Riego',
  [ActividadAgricola.LIMPIEZA]: 'Limpieza',
  [ActividadAgricola.FERTILIZACION]: 'Fertilización',
  [ActividadAgricola.TRATAMIENTO]: 'Tratamiento',
};
