# Corrección de fallos pendientes — `aviso.controller.spec`

Fecha: 2026-11-06  
Framework: Jest + NestJS Testing + Supertest (`test/helpers/endpoint-app`)  
Rama de trabajo: `main`  
Referencia previa: hallazgos H1–H9 / `docs/qa/correcciones-usabilidad.md` (si existe en la rama de usabilidad).

## A. Diagnóstico inicial

Reproducción (antes del cambio):

```text
pnpm exec jest src/modules/comunicacion/aviso.controller.spec.ts --no-coverage
→ Tests: 3 failed, 53 passed, 56 total
```

| # | Prueba | Error observado | Causa raíz | Clasificación | Corrección propuesta |
|---|--------|-----------------|------------|---------------|----------------------|
| 1 | `POST /comunicacion/avisos › 201: publica y pasa el actor` | Esperaba `201`, recibió `400` | Fixture con `fecha: '2026-11-05'`; el día de ejecución (2026-11-06, CR) ya es posterior. `EsFechaDeAviso` exige **hoy o posterior** → ValidationPipe rechaza el body antes de llamar al servicio | Prueba desactualizada (fecha fija caducada) | Fecha relativa a `fechaDeHoy()` |
| 2 | `POST /comunicacion/avisos › recorta espacios del título` | `registrar` con 0 llamadas; no llegó al servicio | Misma `400` por fecha vencida; el trim del título nunca se ejercitó | Prueba desactualizada (misma fixture) | Misma fecha relativa |
| 3 | `PATCH /comunicacion/avisos/:id › 200: edita con actor` | Esperaba `200`, recibió `400` | `edicion = { ...aviso, estado }` heredaba la misma fecha vencida; `EditarAvisoDto` aplica la misma regla | Prueba desactualizada | Misma fecha relativa |

**No era:** defecto de implementación del controlador, mock mal configurado, permisos de Directora, ni entorno de BD.

**H7 intacto:** no se modificó `permisos_rol` ni la política `REPORTES=LECTURA` de Directora. Los casos `403` para roles sin `COMPLETO` (incl. DIRECTORA) siguen en el suite.

Archivos involucrados en el diagnóstico:

- `src/modules/comunicacion/aviso.controller.spec.ts` (fixture)
- `src/modules/comunicacion/dto/registrar-aviso.dto.ts` / `editar-aviso.dto.ts`
- `src/modules/comunicacion/dto/fecha-aviso.validator.ts`
- `src/common/validacion/fecha-no-futura.validator.ts` (`fechaDeHoy` en `America/Costa_Rica`)

## B. Correcciones realizadas

**Archivo modificado:** `src/modules/comunicacion/aviso.controller.spec.ts`

Cambios:

1. Import de `fechaDeHoy` y helper `desplazarDias` (mismo criterio que `editar-aviso.dto.spec.ts`).
2. Fixture `aviso.fecha = desplazarDias(fechaDeHoy(), 7)` en lugar de `'2026-11-05'`.
3. Caso adicional de rechazo: `400: fecha anterior a hoy` (cobertura explícita de la regla de negocio).

**Justificación:** La regla “fecha del aviso = hoy o posterior” es legítima y documentada en el DTO. Hacer pasar las pruebas relajando esa validación habría sido incorrecto. El fallo era determinismo del fixture frente al calendario.

No se tocaron controlador, servicios, permisos ni migraciones.

## C. Resultados de pruebas

### Suite corregido

```text
pnpm exec jest src/modules/comunicacion/aviso.controller.spec.ts --no-coverage
```

| Métrica | Valor |
|---------|-------|
| Total | 57 |
| PASS | 57 |
| FAIL | 0 |
| SKIPPED | 0 |
| BLOCKED | 0 |

(Antes: 56 totales con 3 FAIL; +1 caso nuevo de fecha pasada → 57.)

### Módulo Avisos (ampliado)

```text
pnpm exec jest src/modules/comunicacion/aviso.controller.spec.ts
                 src/modules/comunicacion/dto/editar-aviso.dto.spec.ts
                 src/modules/comunicacion/aviso.service.spec.ts
                 src/modules/comunicacion/aviso.service.endpoints.spec.ts
                 src/modules/auth/permisos.service.spec.ts --no-coverage
```

| Suite | Resultado |
|-------|-----------|
| Avisos + DTO + service + endpoints + permisos | **121 passed**, 5 suites |

### Permisos

```text
…/permisos.service.spec.ts (incluido en el batch anterior)
```

| Resultado |
|-----------|
| **PASS** (13 casos en el suite de permisos; batch conjunto 121 PASS) |

### Compilación

```text
pnpm exec nest build
```

| Resultado |
|-----------|
| **PASS** (exit 0) |

## D. Pruebas de regresión

| Área | Comando / alcance | Resultado | Nota |
|------|-------------------|-----------|------|
| Avisos (controller) | ver §C | **PASS** 57/57 | Incluye 403 Directora / sin COMPLETO |
| Permisos | batch §C | **PASS** | H7 sin cambios de matriz |
| Libro de caja (H1) | `asiento.service.spec` + `asiento.controller.spec` | **PASS** 48/48 | Sin cambios en este fix |
| Impacto H1–H9 | Solo se editó el spec de avisos | Sin regresiones de producto | La fecha fija caducada no afectaba runtime productivo |

## E. Estado final

| Tema | Estado |
|------|--------|
| Tres fallos originales | **Corregidos** |
| Validación de fechas de aviso | Conservada |
| Permisos Directora (H7) | Sin cambio; 403 al publicar se mantiene |
| Problemas pendientes | Ninguno en este suite |
| Riesgo residual | Otros specs de servicio aún usan fechas literales (`2026-11-05` / `2026-11-15`) pero **no pasan por ValidationPipe**, así que no fallan hoy; conviene migrarlos a fechas relativas si en el futuro se reutilizan como payloads HTTP |

## Resumen ejecutivo

| Elemento | Resultado |
|----------|-----------|
| Fallos encontrados inicialmente | 3 |
| Fallos corregidos | 3 |
| Pruebas de Avisos (`aviso.controller.spec`) | PASS (57/57) |
| Pruebas de permisos | PASS |
| Compilación | PASS |
| Regresiones nuevas | 0 |
| Estado general | **Completo** |
