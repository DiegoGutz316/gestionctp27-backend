/** Comodines de `LIKE` más la propia barra invertida, que los escapa. */
const COMODINES_LIKE = /[\\%_]/g;

/**
 * Escapa los comodines de `LIKE` para que el texto se busque literalmente.
 *
 * `%` y `_` son comodines: sin escaparlos, buscar «%» devuelve el catálogo
 * entero y «ma_z» encuentra «maíz», que no es lo que pide quien escribe. En
 * PostgreSQL la barra invertida es el carácter de escape por defecto de
 * `LIKE`, así que también hay que escaparla.
 *
 * El valor viaja como parámetro de la consulta, así que esto no tiene que ver
 * con inyección SQL —que ya estaba cubierta— sino con que el resultado
 * corresponda a lo buscado.
 */
export function escaparComodines(texto: string): string {
  return texto.replace(COMODINES_LIKE, (caracter) => `\\${caracter}`);
}

/** Texto del usuario convertido en un patrón de `LIKE` que busca «contiene». */
export function patronContiene(texto: string): string {
  return `%${escaparComodines(texto)}%`;
}
