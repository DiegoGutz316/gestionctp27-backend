# Correcciones de QA y usabilidad — GestiónCTP27

Fecha: 2026-11-05  
Alcance: nueve hallazgos confirmados (H1–H9) en frontend (`gestionctp27-frontend`), backend (`gestionctp27-backend`) y esquema PostgreSQL (migración versionada).  
Entorno de verificación: BD local `gestionctp27_qa` (no producción).

## Resumen ejecutivo

Se implementó anulación lógica de asientos con motivo y auditoría; se mejoró el formulario de ingreso/egreso con normalización monetaria CR; se aclaró la etiqueta bovina **Ternero/a**; se incorporó **Salud animal** en la navegación pecuaria; se orientó al usuario cuando no hay camas disponibles; se separó cosecha parcial de finalización de ciclo; se confirmó (sin ampliar) que DIRECTORA solo lee avisos; se mejoró la navegación de Avisos e Informe económico; y se ajustó Excel para no sumar movimientos `ANULADO`.

## Migraciones

| Migración | Base | Resultado |
|-----------|------|-----------|
| `1823000000000-AnulacionLogicaAsientos.ts` | `gestionctp27_qa` | **Ejecutada** (`pnpm migration:run`, 2026-11-06) |

Columnas añadidas a `asientos_caja`: `estado` (`VIGENTE`\|`ANULADO`, default `VIGENTE`), `motivo_anulacion`, `anulado_en`, `anulado_por`, con checks e índice `(fondo_id, estado)`.

No se transformaron ni borraron asientos históricos: los existentes quedan `VIGENTE`.

## Decisión de negocio pendiente / confirmada

### H7 — Directora y publicación de avisos

**No se amplió el permiso.** La matriz vigente (`permisos_rol`) asigna a `DIRECTORA` → `REPORTES` → `LECTURA`. La migración `1814000000000-DocentesPublicanAvisos` documenta explícitamente que publicar avisos quedó para docentes y administrador; ampliar a Directora es decisión del equipo.

Efecto observado: Directora recibe **403** al crear/editar/eliminar avisos (esperado). El frontend oculta «Publicar aviso» sin `COMPLETO` y muestra texto de solo consulta.

Si el negocio decide que Directora debe publicar, habría que subir `REPORTES` a `COMPLETO` (o un permiso más fino) mediante migración versionada — **no hecho en esta entrega**.

## Tabla de hallazgos

| ID | Problema original | Causa raíz | Archivos modificados | Solución implementada | Pruebas ejecutadas | Resultado | Riesgos pendientes |
|----|-------------------|------------|----------------------|----------------------|--------------------|-----------|--------------------|
| **H1** | Anular asiento hacía DELETE físico sin motivo | Endpoint/servicio borraba la fila; UI no pedía motivo | BE: `estado-asiento.enum.ts`, `anular-asiento.dto.ts`, `asiento-caja.entity.ts`, `asiento.service.ts` (+spec), `asiento.controller.ts`, `asiento.mapper.ts`, migración `182300…`; FE: `asiento-anular-dialog.tsx`, `asiento.service.ts`, `api.delete` con body, `asientos-libro.tsx`, validación respuesta | Anulación lógica `ANULADO` + motivo obligatorio (≥5), `anuladoEn`/`anuladoPor`; saldo solo con vigentes; UI con advertencia | `asiento.service.spec.ts` + `asiento.controller.spec.ts` (50 tests); migración en QA | **PASS** | Reiniciar/recargar API en entornos donde el proceso no haya recargado tras la migración; regresión E2E manual de anular en UI pendiente en este corte |
| **H2** | Ingreso y egreso a la vez; `85,000` fallaba o se malinterpretaba | Dos campos monetarios + parseo ambiguo | FE: `asiento-form.tsx`, `asiento-editar-dialog.tsx`, `asiento.validacion.ts`, `monto-colones.ts` | Selector Ingreso/Egreso; un solo monto con ₡; mapeo a `ingresos`/`egresos`; regla documentada: 3 dígitos tras `,`/`.` = miles (`85,000`→85000) | Script Node con 10 casos (vacío, 0, negativo, miles CR/US, decimales, ₡) → ALL_PASS | **PASS** | Casos raros tipo `1,2,3` siguen rechazándose por regex/refine |
| **H3** | Usuario busca «TERNERA»; sistema usa `TERNERO` | Enum de dominio único `TERNERO` | FE: `animal.model.ts` (etiqueta), `animal-form.tsx` (ayuda), inventario/Excel etiquetas | Etiqueta **Ternero/a**; valor interno `TERNERO` sin cambio de BD | Revisión estática + compatibilidad histórica (sin migración) | **PASS** | Si negocio exige sexo separado, haría falta nuevo campo — fuera de alcance |
| **H4** | Salud no en nav pecuaria (`saludNav=0`) | Lista de vistas sin enlace a salud | FE: `pecuaria-vistas-nav.tsx` | Ítem **Salud animal** → `/dashboard/pecuaria/salud/nuevo` | Revisión de rutas existentes (`salud/nuevo/page.tsx`) | **PASS** | No hay listado de historial de salud; el acceso es al alta |
| **H5** | Sin camas `DISPONIBLE`, poca orientación | Empty state genérico | FE: `siembra-form.tsx` | Mensaje claro + enlace a gestión de camas; distinción error de carga vs vacío | Revisión de UI/código | **PASS** | Validación backend de cama ocupada se mantiene; no se relajó |
| **H6** | `cerrarCiclo` en flujo de cosecha inducía cierre accidental | Default / UX mezclaba parcial y cierre | FE: `cosecha-form.tsx`, `finalizar-siembra-dialog.tsx` | Cosecha normal: `cerrarCiclo=false`; finalizar solo con `?cerrarCiclo=1` + confirmación explícita | Revisión de flujo y defaults | **PASS** | E2E UI de confirmar cierre no automatizado en este corte |
| **H7** | Directora 403 al publicar avisos | Matriz: Directora `REPORTES=LECTURA`; avisos mutables requieren `COMPLETO` | FE: `avisos-gestion.tsx` (mensaje solo lectura). BE: **sin cambio de permisos** | Confirmada regla de negocio; UI aclara; docentes/admin sí publican | `permisos.service.spec.ts` (13 PASS); specs de aviso mantienen 403 para roles sin `COMPLETO` (incl. DIRECTORA) | **PASS** (decisión: no ampliar) | 3 tests fallidos preexistentes en `aviso.controller.spec` (trim título / PATCH 400) — no introducidos por este cambio; pendiente de higiene del suite |
| **H8** | Avisos/Informe difíciles de encontrar | Menú «Análisis»; informe profundo | FE: `App-sidebar.tsx` (Comunicación / Avisos institucionales), `periodo-detalle.tsx` (Informe económico), `asientos-libro.tsx` (botón Excel) | Renombres y atajos sin cambiar rutas | Revisión de rutas `/dashboard/comunicacion/avisos` y libro | **PASS** | No se creó módulo Reportes nuevo (no requerido) |
| **H9** | Exportación Excel OK; debía respetar anulados | Fórmulas sumaban todas las filas | FE: `informe-excel.ts` | Filas `ANULADO`: montos vacíos, prefijo en descripción, saldo `=G{prev}` | Lógica revisada; Excel previo USAB conservado como regresión de plantilla | **PASS** (lógica); **BLOCKED** smoke binario post-anulación en UI en este corte | Generar un Excel nuevo tras anular un asiento en QA para evidencia binaria |

## Pruebas automatizadas ejecutadas

| Suite | Comando / método | Resultado |
|-------|------------------|-----------|
| Asientos (service + controller) | `pnpm exec jest …/asiento.service.spec.ts …/asiento.controller.spec.ts` | **50 passed** |
| Permisos | `pnpm exec jest …/permisos.service.spec.ts` | **13 passed** |
| Aviso controller | mismo batch | **66 passed, 3 failed** (fallos ajenos a H7; ver arriba) |
| Normalización montos CR | Node inline sobre la regla de `monto-colones.ts` | **ALL_PASS** |
| Migración H1 | `DB_NAME=gestionctp27_qa pnpm migration:run` | **OK** |
| Smoke API | `OPTIONS http://127.0.0.1:4010/auth/login` | **204** |

No se marcaron como PASS pruebas de UI Playwright de esta entrega: la suite USAB previa documenta el estado *antes* de las correcciones (`docs/qa/usabilidad/`).

## Criterios de finalización

1. Correcciones H1–H8 implementadas en código; H9 ajustado para anulados — **sí**.  
2. Sin pérdida de datos existentes; migración aditiva — **sí**.  
3. Permisos consistentes con matriz; H7 documentado — **sí**.  
4. Formularios de caja, siembra y cosecha más claros — **sí**.  
5. Finalizar siembra y anular asiento con confirmación/motivo — **sí**.  
6. Regresión unitaria de asientos/permisos — **sí**; Excel binario post-anulación — **parcial**.  
7. Exportación Excel no rota a nivel de código — **sí**.  
8. Este informe — **sí**.

## Notas técnicas

- Stack real: NestJS + TypeORM + PostgreSQL + Next.js (no .NET / SQL Server).  
- Anulación: el cliente envía `DELETE` con body `{ motivo }`; el servidor no elimina la fila.  
- Regla monetaria documentada en `monto-colones.ts` (comentario de cabecera).
