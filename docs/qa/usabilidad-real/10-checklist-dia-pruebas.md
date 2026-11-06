# Checklist del día de pruebas — usuarios reales

Usar **una copia impresa o digital por sesión**. No sustituye las fichas USAB.

## A. Antes de la primera sesión del día

| # | Verificación | ☐ |
|---|--------------|---|
| A1 | PostgreSQL local en ejecución | |
| A2 | Backend con `DB_NAME=gestionctp27_qa` y puerto **4010** (no piloto 4011) | |
| A3 | Frontend con `NEXT_PUBLIC_API_URL=http://localhost:4010` y puerto **3000** | |
| A4 | Abrir `http://localhost:3000/login` y comprobar carga | |
| A5 | `node scripts/qa/backup-qa.mjs` | |
| A6 | `node scripts/qa/prepare-usab-real.mjs` | |
| A7 | `node scripts/qa/verify-usab-real.mjs` → **14 PASS** | |
| A8 | Credenciales del participante listas (sobre / canal seguro; no en repo) | |
| A9 | Fichas USAB del día impresas o abiertas en blanco | |
| A10 | Cronómetro / reloj visible | |
| A11 | Carpeta `evidencias/USAB-xx/` lista | |
| A12 | Consentimiento verbal/escrito según protocolo | |
| A13 | **No** usar `gestionctp27_qa_piloto` ni API `:4011` con participantes | |

## B. Antes de cada participante

| # | Verificación | ☐ |
|---|--------------|---|
| B1 | `prepare-usab-real.mjs` + `verify-usab-real.mjs` (14 PASS) | |
| B2 | Login de prueba con el rol de la sesión; luego cerrar sesión | |
| B3 | Periodo visible: **USAB REAL — Evaluación** | |
| B4 | Código participante asignado (ej. P-PEC-02) | |
| B5 | Lista de pruebas de esta sesión definida | |
| B6 | Usuario sugerido por prueba (ver tabla abajo) | |

### Usuario sugerido por prueba

| ID | Usuario QA | Rol |
|----|------------|-----|
| USAB-01 | pecuario@qa.test | DOCENTE_PECUARIO |
| USAB-02 | agricola@qa.test | DOCENTE_AGRICOLA |
| USAB-03 | pecuario@qa.test | DOCENTE_PECUARIO |
| USAB-04 | pecuario@qa.test | DOCENTE_PECUARIO |
| USAB-05 | pecuario@qa.test | DOCENTE_PECUARIO |
| USAB-06 | pecuario@qa.test | DOCENTE_PECUARIO |
| USAB-07 | agricola@qa.test | DOCENTE_AGRICOLA |
| USAB-08 | agricola@qa.test | DOCENTE_AGRICOLA |
| USAB-09 | agricola@qa.test o pecuario@qa.test | REPORTES COMPLETO |
| USAB-10 | directora@qa.test | DIRECTORA (LECTURA caja/reportes) |

## C. Durante cada tarea

| # | Verificación | ☐ |
|---|--------------|---|
| C1 | Leer solo la instrucción natural de la ficha | |
| C2 | Cronómetro iniciado al primer clic / interacción | |
| C3 | Anotar errores y ayudas sin guiar menús | |
| C4 | Si falla el entorno → marcar BE, no forzar la tarea | |
| C5 | Guardar captura en `evidencias/USAB-xx/` con código anónimo | |

## D. Al finalizar cada participante

| # | Verificación | ☐ |
|---|--------------|---|
| D1 | Ficha(s) completas (tiempos, resultado, comentarios) | |
| D2 | Evidencias nombradas según `06-guia-evidencias.md` | |
| D3 | Cerrar sesión en el navegador | |
| D4 | Restaurar: `prepare-usab-real.mjs` + `verify` 14 PASS | |

## E. Al cerrar el día

| # | Verificación | ☐ |
|---|--------------|---|
| E1 | Matriz `05-matriz-resultados.md` actualizada (solo datos reales) | |
| E2 | Backup final `backup-qa.mjs` | |
| E3 | Servicios apagados o dejados solo en QA documentado | |
| E4 | No quedan credenciales en capturas públicas | |
