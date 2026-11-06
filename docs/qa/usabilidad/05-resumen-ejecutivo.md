# Resumen ejecutivo — Pruebas de usabilidad GestiónCTP27

## Veredicto técnico

Las **10 pruebas de usabilidad seleccionadas** tienen flujos **técnicamente ejecutables** en el entorno QA aislado (`gestionctp27_qa`).  
Eso habilita las sesiones con profesores y la directora; **no** certifica usabilidad humana.

| Resultado | Cantidad |
|---|---|
| PASS técnico (USAB-01…10) | 10 / 10 |
| FAIL técnico final | 0 |
| BLOCKED / NOT RUN | 0 |
| Sesiones con usuarios reales | **Pendientes** |

## Qué se hizo

1. Arranque de PostgreSQL local, API en `:4010` y frontend en `:3000` contra QA.
2. Preparación de datos (periodo, fondos, Luna, cultivos, siembra tomate).
3. Ejecución API de los 10 escenarios + comprobaciones negativas (dual monto, coma, permisos, fecha pasada).
4. Recorrido UI con Playwright: capturas y descarga real del Excel del informe.
5. Documentación en `docs/qa/usabilidad/`.

## Principales riesgos para el colegio

1. **Anular un asiento borra el historial** (sin motivo).
2. **Cerrar el ciclo de siembra** desde la cosecha puede cortar cosechas futuras.
3. **Salud** es difícil de encontrar en pecuaria.
4. **Siembra** se bloquea si no hay cama libre, sin guía clara.
5. **Informes y avisos** no coinciden con la expectativa de un menú «Reportes»; la Directora no publica avisos.
6. **Ingreso vs egreso** en el mismo formulario invita a errores de dinero.

## Evidencias disponibles

Carpeta: `docs/qa/usabilidad/evidencias/`

- 16 capturas PNG de pantallas clave.
- 1 Excel: `Informe-Economico-UDP Unidad Pecuaria Periodo USAB QA.xlsx`.
- JSON crudo: `_resultados-tecnicos.json`.

## Pruebas pendientes (obligatorias)

Ejecutar las fichas de `03-fichas-usuarios.md` con:

- al menos un docente pecuario,
- al menos un docente agrícola,
- la directora,
- idealmente un perfil «primera vez».

No sustituir esas sesiones con automatización.

## Próximos pasos

1. Reservar 45–60 min por participante.
2. Restaurar datos QA limpios antes de cada ronda.
3. Completar fichas vacías; clasificar hallazgos con la escala 0–3.
4. Priorizar correcciones de `04-hallazgos-recomendaciones.md` (H-03, H-08, H-06, H-07 primero).
5. Antes de demos: verificar que `/login` responda 200 (limpiar `.next` si reaparece el 404).

## Archivos del informe

| Archivo | Contenido |
|---|---|
| `01-plan-pruebas-usabilidad.md` | Alcance, participantes, metodología |
| `02-ejecucion-tecnica.md` | Resultados PASS/FAIL y evidencias |
| `03-fichas-usuarios.md` | Guiones y plantillas vacías |
| `04-hallazgos-recomendaciones.md` | Problemas, gravedad, backlog |
| `05-resumen-ejecutivo.md` | Este resumen |
