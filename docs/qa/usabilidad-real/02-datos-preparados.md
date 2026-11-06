# Datos preparados — USAB REAL

**Base:** `gestionctp27_qa` (verificado; `.env` por defecto apunta a `gestionctp27` — la API de evaluación debe arrancar con `DB_NAME=gestionctp27_qa`).  
**Respaldo previo:** `backups/qa/gestionctp27_qa_*.dump` (local, gitignored).  
**Baseline aplicado:** `node scripts/qa/prepare-usab-real.mjs`  
**Verificación:** `node scripts/qa/verify-usab-real.mjs` → 14 PASS (2026-11-06).

## Advertencia de entorno

| Elemento | Valor seguro |
|----------|--------------|
| BD evaluación | `gestionctp27_qa` |
| BD no usar en sesiones | `gestionctp27`, Supabase/producción |
| Periodo visible | **USAB REAL — Evaluación** (id 4 al preparar) |
| Un solo periodo abierto | Regla de negocio: no abrir otro sin cerrar este |

## Libro de Caja

| Concepto | Valor |
|----------|-------|
| Periodo | `USAB REAL — Evaluación` / ABIERTO |
| Unidad Pecuaria | Fondo **SOLICITADO** ₡200.000 |
| Asiento preparado USAB-03 | Nº1 · egreso ₡5.000 · «Compra de concentrado (registro de prueba USAB-03)» · VIGENTE |
| Saldo esperado antes de USAB-01 | ₡195.000 (= 200.000 − 5.000) |
| Tras USAB-01 (ingreso ₡85.000) | ₡280.000 |
| Unidad Agrícola | Fondo **PENDIENTE** (sin monto) — listo para USAB-02 (₡150.000) |

## Gestión Pecuaria

| Concepto | Valor |
|----------|-------|
| Código libre USAB-04 | `BOV-QA-01` (no debe existir al iniciar) |
| Nombre sugerido al participante | Estrella (Holstein, categoría Ternero/a) |
| Luna | código `LUNA-USAB`, especie VACA, categoría VACA, Holstein, ACTIVO |
| USAB-05 / USAB-06 | Usar **Luna** (`LUNA-USAB`) |

Animales de sonda previos quedaron `INACTIVO` para reducir ruido en listados.

## Gestión Agrícola

| Concepto | Valor |
|----------|-------|
| Ubicación | Invernadero 1 |
| Cama libre USAB-07 | `USAB-REAL-LIBRE` · **DISPONIBLE** |
| Cultivo lechuga | Activo en catálogo |
| Siembra tomate USAB-08 | Cama `USAB-TOMATE`, siembra **activa** (`finalizada_en` nula), cultivo Tomate |
| Tras cosecha parcial | La siembra debe seguir activa (no finalizar ciclo) |

## Reportes y Avisos

| Concepto | Valor |
|----------|-------|
| Publicar (USAB-09) | `agricola@qa.test` o `pecuario@qa.test` (`REPORTES=COMPLETO`) |
| Directora | `REPORTES=LECTURA` — consulta; **no** publicar (H7) |
| Imagen ejemplo | `docs/qa/usabilidad-real/recursos/flyer-ejemplo-usab09.png` |
| Fecha aviso | Hoy o futura (validador CR) |
| Informe económico USAB-10 | Periodo USAB REAL → Unidad Pecuaria → Informe económico / Excel |

## Usuarios QA (correos)

| Correo | Rol |
|--------|-----|
| pecuario@qa.test | DOCENTE_PECUARIO |
| agricola@qa.test | DOCENTE_AGRICOLA |
| directora@qa.test | DIRECTORA |
| admin@qa.test | ADMINISTRADOR |

Contraseñas: ver `CREDENCIALES.local.md` (no versionado).

## Matriz prueba → usuario sugerido

| ID | Usuario sugerido | Permiso clave |
|----|------------------|---------------|
| USAB-01 | pecuario@qa.test | LIBRO_CAJA COMPLETO |
| USAB-02 | agricola@qa.test | LIBRO_CAJA COMPLETO |
| USAB-03 | pecuario@qa.test | LIBRO_CAJA COMPLETO |
| USAB-04 | pecuario@qa.test | PECUARIA COMPLETO |
| USAB-05 | pecuario@qa.test | PECUARIA COMPLETO |
| USAB-06 | pecuario@qa.test | PECUARIA COMPLETO |
| USAB-07 | agricola@qa.test | AGRICOLA COMPLETO |
| USAB-08 | agricola@qa.test | AGRICOLA COMPLETO |
| USAB-09 | agricola@qa.test o pecuario@qa.test | REPORTES COMPLETO |
| USAB-10 | directora@qa.test (consulta/export) | LIBRO_CAJA LECTURA + REPORTES LECTURA |

## Estado H1–H9 en este entorno

| Hallazgo | Frontend | Backend `main` / BD QA | Impacto en las 10 pruebas |
|----------|----------|-------------------------|---------------------------|
| H1 anulación lógica | UI con motivo/ANULADO | BD tiene columnas; código `main` aún puede hacer DELETE físico | No requerido por USAB-01…10 |
| H2–H8 | Presente en FE | N/A o parcial | Cubierto |
| H7 Directora | Mensaje solo lectura | `REPORTES=LECTURA` verificado | USAB-09/10 respetan matriz |
| H9 Excel | Ajuste ANULADO en FE | — | USAB-10 usa export vigente |

## Notas de repetición

Tras cada participante (o al final del día):

```bash
node scripts/qa/backup-qa.mjs
node scripts/qa/prepare-usab-real.mjs
node scripts/qa/verify-usab-real.mjs
```

Si un participante ya usó `BOV-QA-01`, el prepare lo archiva y vuelve a dejar el código libre.
