# Informe del piloto técnico — USAB-01…10

**Fecha:** 2026-11-06  
**Tipo:** ensayo técnico automatizado + humo UI (navegador).  
**No es** una sesión con profesores ni directora reales.

## 1. Entorno del piloto

| Elemento | Valor |
|----------|-------|
| Baseline participantes | `gestionctp27_qa` + API **4010** (no modificado por el ensayo) |
| Copia desechable | `gestionctp27_qa_piloto` + API **4011** |
| Frontend humo UI | `http://localhost:3000` → `NEXT_PUBLIC_API_URL=http://localhost:4011` |
| Método principal | `scripts/qa/piloto-usab-api.mjs` (HTTP + cookies JWT) |
| UI | Login, dashboard, periodo, informe económico, clic **Descargar Excel** |
| Evidencias | `evidencias/piloto-tecnico/` |

Aislamiento verificado tras el ensayo:

- `avisosPilotoEnQA: 0`
- `bovQa01Ocupado: 0` en baseline
- `asientosPeriodoAbierto: 1` (solo el egreso USAB-03 de baseline)
- `verify-usab-real.mjs` → **14 PASS**

## 2. Resultado por prueba

| Prueba | Estado técnico | Problemas encontrados | Evidencia |
|--------|----------------|----------------------|-----------|
| USAB-01 | **PASS** | Ninguno. Ingreso ₡85.000; saldo 195000→280000 | `piloto-tecnico/USAB-01.json` |
| USAB-02 | **PASS** | Ninguno. Fondo agrícola solicitado ₡150.000 | `piloto-tecnico/USAB-02.json` |
| USAB-03 | **PASS** | Ninguno. Egreso 5000→3000 | `piloto-tecnico/USAB-03.json` |
| USAB-04 | **PASS** | Ninguno. `BOV-QA-01` Estrella / TERNERO / Holstein | `piloto-tecnico/USAB-04.json` |
| USAB-05 | **PASS** | Ninguno. Leche Luna 12 L | `piloto-tecnico/USAB-05.json` |
| USAB-06 | **PASS** | Ninguno. Salud Luna SANO | `piloto-tecnico/USAB-06.json` |
| USAB-07 | **PASS** | Ninguno. Siembra lechuga 50 UNIDADES en `USAB-REAL-LIBRE` | `piloto-tecnico/USAB-07.json` |
| USAB-08 | **PASS** | Ninguno. Cosecha 12,5 kg; siembra tomate sigue activa | `piloto-tecnico/USAB-08.json` |
| USAB-09 | **PASS** | Ninguno funcional. Aviso + flyer; Directora **403** (H7) | `piloto-tecnico/USAB-09.json` |
| USAB-10 | **PASS** | Ninguno. Directora lee libro + pie; UI Excel generó descarga | `USAB-10.json` + `UI-informe-economico-excel.png` |

**Resumen ejecución limpia (2.ª corrida en BD piloto fresca):** 10 PASS, 0 FAIL.

### Incidentes de la 1.ª corrida (corregidos en el script, no en producto)

| Incidente | Clasificación | Acción |
|-----------|---------------|--------|
| USAB-08: filtro `?estado=ACTIVA` inválido → lista vacía | Defecto del **script piloto** | Usar `?cultivo=Tomate` |
| USAB-09/10: HTTP **429** Throttler en logins seguidos | Límite de seguridad del API (esperado bajo ráfaga) | Reintentos + reutilizar sesión agrícola |

## 3. Observaciones técnicas vs usabilidad pendiente

### Técnicos reproducidos

- Throttling de login: en sesiones reales (pocos intentos) no debería bloquear; si un participante falla varias veces la contraseña, esperar o usar otra cuenta.
- Excel se genera en el **frontend** (`exceljs`); el piloto API valida datos + pie; la UI confirmó botón **Descargar Excel** operativo en el informe.
- En `main`, el backend aún puede hacer DELETE físico de asientos pese a columnas de anulación en QA: **no afecta** USAB-01…10.

### Posibles dificultades de usabilidad (solo hipótesis para validar con personas)

- Encontrar “Informe económico” vs “Ver libro”.
- Formato monetario ₡85.000 / 12,5 kg.
- Distinguir cosecha parcial vs finalizar ciclo.
- Ubicación de “Salud animal” y “Avisos institucionales”.
- Directora: ausencia de “Publicar” (correcto por H7; puede percibirse como error).

No se atribuyen tasas de éxito humanas a estas hipótesis.

## 4. Permisos

| Escenario | Resultado |
|-----------|-----------|
| Docente pecuario caja/pecuaria | OK |
| Docente agrícola caja/agrícola/avisos | OK |
| Directora publica aviso | **403** (correcto) |
| Directora consulta libro + pie informe | OK |
| Matriz sin cambios | Confirmado |

## 5. Fichas y documentación

Revisión de `04-fichas-evaluacion.md`: las 10 incluyen escenario, instrucción natural, resultado esperado, espacios de tiempo/errores/ayudas/observaciones/evidencia. Las instrucciones no indican clics de menú.

Nuevos archivos de esta fase:

- `10-checklist-dia-pruebas.md`
- `11-informe-piloto.md` (este)

## 6. Estado para sesiones reales

| Pregunta | Respuesta |
|----------|-----------|
| ¿FE/BE funcionan? | Sí (QA 4010 + FE 3000; piloto 4011 solo ensayo) |
| ¿10 pruebas técnicas ejecutables? | Sí (10/10 PASS en piloto) |
| ¿Permisos correctos? | Sí |
| ¿Baseline restaurado? | Sí (14 PASS; sin fugas del piloto) |
| ¿Fichas completas? | Sí |
| ¿Checklist del día? | Sí |
| ¿Bloqueos antes de sesiones reales? | **Ninguno crítico**. Recordar apuntar FE a **4010**, no a 4011 |

## 7. Comandos útiles del día

```bat
set DB_NAME=gestionctp27_qa
set PORT=4010
pnpm start:dev

set NEXT_PUBLIC_API_URL=http://localhost:4010
pnpm dev

node scripts/qa/prepare-usab-real.mjs
node scripts/qa/verify-usab-real.mjs
```
