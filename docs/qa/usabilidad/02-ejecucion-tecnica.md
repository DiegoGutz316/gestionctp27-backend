# Ejecución técnica de las 10 pruebas USAB

**Generado:** 2026-11-06 (hora local CR)  
**Base de datos:** `gestionctp27_qa` (PostgreSQL local)  
**API:** `http://127.0.0.1:4010`  
**Frontend:** `http://localhost:3000` (`NEXT_PUBLIC_API_URL=http://localhost:4010`)  
**Automatización UI:** Playwright Chromium (headless) en carpeta temporal, sin modificar el repo  
**Artefacto crudo:** `_resultados-tecnicos.json`  
**Evidencias:** `evidencias/`

> **IMPORTANTE:** `PASS` = el flujo técnico funciona según lo esperado en QA.  
> **No** significa que un usuario real haya completado la tarea con buena usabilidad.

---

## Resumen de estados

| ID | Módulo | Estado técnico | Evidencia principal |
|---|---|---|---|
| USAB-01 | Libro de Caja | **PASS** | `USAB-01-libro-asientos.png` |
| USAB-02 | Libro de Caja | **PASS** | `USAB-02-periodo-detalle.png` |
| USAB-03 | Libro de Caja | **PASS** | `USAB-03-acciones-asiento.png` |
| USAB-04 | Gestión Pecuaria | **PASS** | `USAB-04-animal-form.png` |
| USAB-05 | Gestión Pecuaria | **PASS** | `USAB-05-produccion-form.png` |
| USAB-06 | Gestión Pecuaria | **PASS** | `USAB-06-pecuaria-home.png`, `USAB-06-salud-form.png` |
| USAB-07 | Gestión Agrícola | **PASS** | `USAB-07-siembra-form.png` |
| USAB-08 | Gestión Agrícola | **PASS** | `USAB-08-cosecha-form.png`, `USAB-08-cosecha-cerrarCiclo1.png` |
| USAB-09 | Reportes y Avisos | **PASS** | `USAB-09-avisos-lista.png`, `USAB-09-aviso-form.png` |
| USAB-10 | Reportes y Avisos | **PASS** | `USAB-10-informe.png` + Excel descargado |
| UI-PLAYWRIGHT | Transversal | **PASS** | 16 capturas + 1 Excel |

**BLOCKED / NOT RUN:** ninguno de los 10, tras reparación de datos y de IDs de asiento.

---

## Condiciones iniciales QA

- Periodo `Periodo USAB QA` (id 4) estado `ABIERTO`.
- Unidades: Pecuaria (id 7) y Agrícola (id 8).
- Fondos solicitados: agrícola ₡150.000; pecuaria ₡200.000.
- Animal `Luna` (`LUNA-USAB`, especie `VACA`).
- Cultivos activos: Lechuga, Tomate, Maíz.
- Siembra de Tomate activa (cama `USAB-TOMATE`).
- Usuarios `@qa.test` con contraseña de laboratorio.

Migraciones aplicadas en QA durante la preparación (solo QA): `CuidadosAgricolas`, `CatalogoCultivos`, `TipoCultivoVerdura`, `EspecialidadesLanding`.

---

## Detalle por prueba

### USAB-01 — Registrar un ingreso (₡85.000 venta de carne)

| Campo | Valor |
|---|---|
| Estado | PASS |
| Actor API | `pecuario@qa.test` |
| Datos | ingresos 85000, egresos 0, descripción «Venta de carne», fecha 2026-11-05 |
| Resultado | HTTP 201; totales libro `ingresos=85000`, `saldo=285000` (fondo 200000 + ingreso) |
| Dual ingreso+egreso | HTTP 400 — «Indique un ingreso o un egreso, no ambos…» |
| Formato `85,000` | HTTP 400 — «El ingreso debe ser un número válido» |
| Idempotency-Key | Debe ser UUID; sin UUID válido → 400 |
| UI observada | Formulario muestra **Ingresos** y **Egresos** a la vez (`ingresos:2`, `egresos:2` en labels) |
| Archivos | `asiento-form.tsx`, `asiento.validacion.ts`, `crear-asiento.dto.ts` |

### USAB-02 — Solicitar fondo inicial agrícola (₡150.000)

| Campo | Valor |
|---|---|
| Estado | PASS |
| Actor | `agricola@qa.test` |
| Resultado | POST solicitar → 201, estado `SOLICITADO`; GET libro → 200 |
| UI | Tras solicitar ambos fondos, botones «Solicitar fondo» = 0 (esperado) |
| Riesgo | Etiqueta «Solicitar fondo» puede no leerse como «activar el dinero inicial del libro» |
| Archivos | `solicitar-fondo-dialog.tsx`, `periodo-detalle.tsx`, `periodo.service.ts` |

### USAB-03 — Corregir un asiento (egreso ₡5.000 → ingreso)

| Campo | Valor |
|---|---|
| Estado | PASS (tras localizar el id dentro de `asientos[]`) |
| Editar | PATCH 200; queda ingresos 5000 / egresos 0 |
| Anular | DELETE 200; el asiento **desaparece** del listado (`permaneceTrasAnular=false`) |
| UI | Botones Anular=3 y Editar=3 visibles en el libro |
| Hallazgo técnico | POST/PATCH de asiento responden el **libro completo**, no el asiento suelto |
| Implicación UX | Anular = borrado físico sin motivo en el diálogo |
| Archivos | `asiento-anular-dialog.tsx`, `asiento-editar-dialog.tsx`, `asiento.service.ts` |

### USAB-04 — Registrar bovino (Estrella / BOV-QA-01)

| Campo | Valor |
|---|---|
| Estado | PASS |
| Valor inválido | `categoriaBovina: "TERNERA"` → 400 |
| Valor válido | `TERNERO` → 201 (etiqueta UI: «Ternero/a») |
| Riesgo confirmado | Persona que busca «Ternera» puede fallar o dudar |
| UI | Formulario de animal y listado de ganado bovino capturados |
| Archivos | `animal-form.tsx`, `categoria-bovina.enum.ts` |

### USAB-05 — Producción de leche (Luna, 12,5 L)

| Campo | Valor |
|---|---|
| Estado | PASS |
| Campo API correcto | `tipoProduccion` (no `tipo`) |
| LECHE | 201 |
| CARNE | 201 (también aceptado para vaca) |
| Riesgo | Usuario puede registrar «Carne» por error; unidad de litros no viaja en el DTO |
| Archivos | `registrar-produccion.dto.ts`, `produccion.model.ts` |

### USAB-06 — Estado de salud (mastitis)

| Campo | Valor |
|---|---|
| Estado | PASS |
| Campo API | `condicionObservada: "ENFERMO"` |
| Resultado | 201 |
| UI crítica | En home pecuaria: `saludNav=0`, `vacunasNav=0`, `desparasitaNav=0` |
| Riesgo confirmado | Salud no aparece como enlace evidente en la navegación principal |
| Archivos | `salud-form.tsx`, `pecuaria-vistas-nav.tsx` |

### USAB-07 — Siembra de lechuga (50 plantas)

| Campo | Valor |
|---|---|
| Estado | PASS |
| Bloqueo inicial | Sin camas `DISPONIBLE` el POST falla («Seleccione una cama…») |
| Recuperación | Crear cama (`codigo` + `ubicacion`) → estado default `DISPONIBLE` → siembra 201 |
| Riesgo confirmado | Flujo multi-paso no guiado: sin cama libre el formulario queda inutilizable |
| Archivos | `siembra-form.tsx`, `crear-cama-cultivo.dto.ts` |

### USAB-08 — Cosecha parcial sin cerrar ciclo

| Campo | Valor |
|---|---|
| Estado | PASS |
| Payload | `cantidadObtenida: 12.5`, `unidadMedida: "KG"`, `cerrarCiclo: false` |
| Resultado | Cosecha 201; siembra de tomate sigue con `finalizadaEn=null` |
| UI | Capturas del formulario y de `?cerrarCiclo=1` |
| Riesgo | Switch «Finalizar la siembra» / query `cerrarCiclo=1` (código); texto no contado en snapshot headless sin interacción |
| Archivos | `cosecha-form.tsx`, `registrar-cosecha.dto.ts` |

### USAB-09 — Publicar aviso institucional

| Campo | Valor |
|---|---|
| Estado | PASS (creación admin) |
| Admin | POST aviso 201; flyer PNG 1×1 → 200; públicos 200 |
| Directora | POST 403 — «Su rol no tiene acceso a Reportes.» |
| Fecha pasada | 400 — «La fecha del aviso debe ser hoy o posterior» |
| UI | `reportesLinks=0`, `avisosLinks=1`, texto Análisis presente |
| Archivos | `aviso-form.tsx`, `App-sidebar.tsx`, `aviso.controller.ts` |

### USAB-10 — Informe económico + Excel

| Campo | Valor |
|---|---|
| Estado | PASS |
| Directora | GET libro 200; PATCH pie informe 200 |
| UI | Informe visible; botón Excel=1; saldoText=1 |
| Descarga | `Informe-Economico-UDP Unidad Pecuaria Periodo USAB QA.xlsx` guardado en `evidencias/` |
| Riesgo | No existe menú «Reportes»; ruta profunda periodo → unidad → informe |
| Archivos | `informe-economico.tsx`, `informe-excel.ts` |

---

## Problemas reproducidos (técnicos / de interfaz)

1. **Anulación destructiva** del asiento (DELETE + desaparición del listado).
2. **Dualidad ingreso/egreso** y rechazo de formato con coma.
3. **Vocabulario bovino:** `TERNERA` inválido; válido `TERNERO` («Ternero/a»).
4. **Salud no enlazada** en la home de pecuaria (conteo Playwright = 0).
5. **Sin camas disponibles** bloquea siembra sin mensaje de siguiente paso.
6. **Directora no puede publicar avisos** (403 por permiso REPORTES).
7. **No hay enlace «Reportes»** en sidebar; Avisos bajo Análisis.
8. **Caché Next `.next`:** `/login` llegó a devolver 404 hasta limpiar caché (entorno local).

## Simulación de perfiles (hipótesis, no resultados reales)

| Perfil | Dónde fallaría con más probabilidad |
|---|---|
| Profesor básico | USAB-01 (ingreso vs egreso), USAB-04 (ternera), USAB-06 (encontrar Salud), USAB-08 (switch finalizar) |
| Directora | USAB-10 (encontrar informe), USAB-09 (creer que puede publicar) |
| Primera vez | USAB-02 (significado de «Solicitar fondo»), USAB-07 (cama no disponible), USAB-10 (ruta profunda) |

Estas hipótesis deben validarse en las fichas de `03-fichas-usuarios.md`.
