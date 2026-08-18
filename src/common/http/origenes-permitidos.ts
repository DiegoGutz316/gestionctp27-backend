export function obtenerOrigenesPermitidos(
  get: (clave: string) => string | undefined,
): string[] {
  const configurados = [get('CORS_ORIGIN'), get('CORS_ORIGINS')]
    .filter((valor): valor is string => Boolean(valor))
    .flatMap((valor) => valor.split(','))
    .map((valor) => valor.trim())
    .filter(Boolean);
  return configurados.length > 0
    ? [...new Set(configurados)]
    : ['http://localhost:3000'];
}
