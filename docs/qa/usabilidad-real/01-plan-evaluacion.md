# Plan de evaluación de usabilidad — GestiónCTP27

**Fase:** preparación para pruebas con usuarios reales  
**Estado de las sesiones:** *pendientes de ejecución* (no se inventan resultados)  
**Fecha de preparación:** 2026-11-06  
**Entorno:** `gestionctp27_qa` (PostgreSQL local) + API/FE locales  
**Alcance:** exactamente 10 pruebas (USAB-01 … USAB-10). **Sin módulo Inventario.**

## 1. Objetivos

1. Observar si profesores y la directora pueden completar tareas cotidianas del colegio sin capacitación previa detallada.
2. Medir tiempo, errores, pedidos de ayuda y tasas de completitud.
3. Contrastar la experiencia tras las correcciones H1–H9 (usabilidad técnica previa).
4. Generar evidencia para el informe universitario, con participantes anonimizados.

## 2. Fuera de alcance

- Pruebas de carga o seguridad ofensiva.
- Evaluación del módulo Inventario.
- Cambiar la matriz de permisos (H7: Directora = `REPORTES=LECTURA`).
- Usar o modificar la base de producción / `gestionctp27` de desarrollo diario.

## 3. Perfiles de participante

| Código sugerido | Perfil real | Rol en el sistema | Pruebas recomendadas |
|-----------------|-------------|-------------------|----------------------|
| P-PEC-01… | Profesor(a) pecuario(a) | `DOCENTE_PECUARIO` (`pecuario@qa.test`) | USAB-01, 03, 04, 05, 06, 09*, 10** |
| P-AGR-01… | Profesor(a) agrícola | `DOCENTE_AGRICOLA` (`agricola@qa.test`) | USAB-02, 07, 08, 09, 10** |
| P-DIR-01… | Directora | `DIRECTORA` (`directora@qa.test`) | USAB-10 (consulta/export); observar bloqueo en USAB-09 si se intenta publicar |

\* Docente pecuario también tiene `REPORTES=COMPLETO` y puede publicar avisos.  
\*\* Directora y docentes con `LIBRO_CAJA=LECTURA/COMPLETO` pueden consultar; la exportación Excel del informe es usable con lectura de asientos.

## 4. Metodología

- **Tipo:** prueba de usabilidad moderada, pensamiento en voz alta opcional.
- **Formato:** 1 participante + 1 moderador (+ observador opcional).
- **Duración sugerida por sesión:** 45–60 min (selección de 4–6 tareas) o bloque completo ~90 min.
- **Ambiente:** laboratorio o oficina del colegio, navegador Chrome/Edge, resolución típica de escritorio.
- **Datos:** estado inicial restaurado entre participantes (`scripts/qa/prepare-usab-real.mjs`).
- **Anonimato:** solo códigos `P-xxx`; sin nombres en evidencias públicas.

Definiciones de métricas: ver §8 de este plan y `05-matriz-resultados.md`.

## 5. Las 10 pruebas

| ID | Módulo | Tarea |
|----|--------|-------|
| USAB-01 | Libro de Caja | Registrar ingreso ₡85.000 |
| USAB-02 | Libro de Caja | Solicitar fondo inicial ₡150.000 |
| USAB-03 | Libro de Caja | Corregir asiento mal registrado |
| USAB-04 | Gestión Pecuaria | Registrar ternera Holstein |
| USAB-05 | Gestión Pecuaria | Registrar producción de leche |
| USAB-06 | Gestión Pecuaria | Registrar estado de salud animal |
| USAB-07 | Gestión Agrícola | Registrar siembra de lechuga |
| USAB-08 | Gestión Agrícola | Cosecha parcial de tomate |
| USAB-09 | Reportes y Avisos | Publicar aviso institucional |
| USAB-10 | Reportes y Avisos | Consultar y exportar informe económico |

## 6. Cronograma sugerido

| Día | Actividad |
|-----|-----------|
| D0 | Checklist técnico (`08-checklist-preparacion.md`), restaurar baseline |
| D1 | 2–3 docentes pecuarios (USAB-01,03–06,09) |
| D2 | 2–3 docentes agrícolas (USAB-02,07–08,09) |
| D3 | Directora (USAB-10; intento controlado USAB-09 si el protocolo lo incluye) |
| D4 | Consolidación de matriz y borrador de informe (`09-informe-final-plantilla.md`) |

## 7. Criterios de “tarea completada”

La tarea se marca **completada** solo si el sistema refleja el resultado esperado (asiento, animal, siembra, aviso publicado, archivo Excel descargado, etc.) y el participante lo reconoce, **sin que el moderador haya ejecutado la acción por él**.

## 8. Definiciones de medición

| Concepto | Definición operativa |
|----------|----------------------|
| **Error** | Acción incorrecta que el sistema rechaza, o camino que el participante deshace; p. ej. monto mal tipado, unidad equivocada, intento de publicar sin permiso |
| **Solicitud de ayuda** | Pregunta explícita al moderador (“¿dónde se registra…?”) o petición de pista |
| **Ayuda del moderador** | Pista verbal dada (contar cada pista); no hacer clic por el usuario |
| **Tarea abandonada** | El participante declara que no puede continuar |
| **Bloqueada por entorno** | Fallo técnico (API caída, datos no restaurados) — no cuenta como fallo de usabilidad del usuario |
| **% completadas** | `(completadas / intentadas) × 100` por participante y global |

## 9. Referencias técnicas de preparación

- Scripts: `scripts/qa/backup-qa.mjs`, `prepare-usab-real.mjs`, `verify-usab-real.mjs`
- Datos: `02-datos-preparados.md`
- Credenciales: `CREDENCIALES.local.md` (gitignored)
- Correcciones previas: `docs/qa/correcciones-fallos-avisos.md` (y `correcciones-usabilidad.md` si está en la rama de trabajo)
