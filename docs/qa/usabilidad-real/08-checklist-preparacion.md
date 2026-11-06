# Checklist de preparación — USAB REAL

Marcado según verificación técnica del **2026-11-06**. Las sesiones con personas reales siguen **pendientes**.

## Entorno y seguridad

| # | Ítem | Estado |
|---|------|--------|
| 1 | BD objetivo es `gestionctp27_qa` (no producción) | ✅ Verificado |
| 2 | `.env` default = `gestionctp27` — API de prueba fuerza `DB_NAME=gestionctp27_qa` | ✅ Documentado |
| 3 | Respaldo QA creado en `backups/qa/*.dump` | ✅ Hecho (gitignored) |
| 4 | Migración anulación lógica presente en QA | ✅ |
| 5 | PostgreSQL local disponible | ✅ |

## Datos baseline

| # | Ítem | Estado |
|---|------|--------|
| 6 | Periodo `USAB REAL — Evaluación` abierto | ✅ |
| 7 | Fondo pecuario SOLICITADO ₡200.000 | ✅ |
| 8 | Egreso ₡5.000 USAB-03 listo | ✅ |
| 9 | Fondo agrícola PENDIENTE | ✅ |
| 10 | `BOV-QA-01` libre | ✅ |
| 11 | Luna `LUNA-USAB` activa (VACA) | ✅ |
| 12 | Cama `USAB-REAL-LIBRE` DISPONIBLE | ✅ |
| 13 | Siembra tomate activa `USAB-TOMATE` | ✅ |
| 14 | Cultivos Lechuga y Tomate activos | ✅ |
| 15 | `verify-usab-real.mjs` → 14 PASS | ✅ |

## Usuarios y permisos (H7)

| # | Ítem | Estado |
|---|------|--------|
| 16 | Login pecuario / agrícola / directora | ✅ HTTP 200 |
| 17 | Directora `REPORTES=LECTURA` | ✅ |
| 18 | Directora POST aviso → 403 | ✅ |
| 19 | Docentes `REPORTES=COMPLETO` | ✅ |
| 20 | Credenciales fuera del repo (`CREDENCIALES.local.md`) | ✅ |

## Aplicación

| # | Ítem | Estado |
|---|------|--------|
| 21 | API en puerto 4010 con QA | ✅ Arrancada en preparación |
| 22 | Frontend con `NEXT_PUBLIC_API_URL` → API QA | ⚠️ Pendiente en la máquina del moderador al momento de la sesión |
| 23 | Correcciones FE H2–H8 / nav avisos-informe | ✅ Presentes en repo frontend |
| 24 | H1 soft-delete en código backend `main` | ⚠️ Columnas en BD; entidad/servicio en `main` aún con DELETE físico — **no bloquea** USAB-01…10 |

## Documentación y evidencias

| # | Ítem | Estado |
|---|------|--------|
| 25 | Plan, datos, guion, fichas (10), matriz, evidencias, restauración, plantilla | ✅ |
| 26 | Carpetas `evidencias/USAB-01` … `USAB-10` | ✅ |
| 27 | Flyer ejemplo USAB-09 | ✅ `recursos/flyer-ejemplo-usab09.png` |
| 28 | Pruebas con usuarios reales ejecutadas | ❌ **Pendientes** |

## Listas para ejecutar con usuarios

| ID | ¿Lista? | Dependencia crítica |
|----|---------|---------------------|
| USAB-01 | ✅ | Fondo pecuario + saldo conocido |
| USAB-02 | ✅ | Fondo agrícola PENDIENTE |
| USAB-03 | ✅ | Asiento egreso ₡5.000 |
| USAB-04 | ✅ | `BOV-QA-01` libre |
| USAB-05 | ✅ | Luna |
| USAB-06 | ✅ | Luna + nav Salud |
| USAB-07 | ✅ | Cama libre |
| USAB-08 | ✅ | Siembra tomate activa |
| USAB-09 | ✅ | Docente COMPLETO + flyer |
| USAB-10 | ✅ | Periodo/fondo pecuario + Excel FE |

**Antes de cada persona:** repetir prepare + verify; confirmar FE→API QA.
