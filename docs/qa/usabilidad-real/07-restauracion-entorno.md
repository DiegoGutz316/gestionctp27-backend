# Restauración del entorno QA entre participantes

## Principios

1. Solo `gestionctp27_qa`.
2. Respaldo antes de cambios amplios.
3. Preferir el script idempotente a borrados manuales.
4. No tocar producción ni `gestionctp27` de desarrollo.

## Procedimiento estándar (entre participantes)

```bash
# 1) Respaldo puntual
node scripts/qa/backup-qa.mjs

# 2) Reaplicar baseline USAB REAL
node scripts/qa/prepare-usab-real.mjs

# 3) Verificar
node scripts/qa/verify-usab-real.mjs
```

Opcional — rotar contraseñas QA:

```bash
set QA_USAB_PASSWORD=********
node scripts/qa/prepare-usab-real.mjs
```

## Qué restablece el prepare

- Nombre del periodo abierto → `USAB REAL — Evaluación`
- Fondo pecuario → SOLICITADO ₡200.000 + un egreso ₡5.000 USAB-03
- Fondo agrícola → PENDIENTE (sin monto)
- Código `BOV-QA-01` libre (archiva el ocupante)
- Luna `LUNA-USAB` activa como VACA
- Cama `USAB-REAL-LIBRE` DISPONIBLE
- Siembra de tomate activa en `USAB-TOMATE`

## Restauración desde dump

Si el baseline quedó irrecuperable:

```bash
# ¡Solo sobre gestionctp27_qa!
pg_restore -c -d gestionctp27_qa backups/qa/gestionctp27_qa_XXXX.dump
node scripts/qa/prepare-usab-real.mjs
node scripts/qa/verify-usab-real.mjs
```

En Windows use la ruta completa a `pg_restore` bajo `C:\Program Files\PostgreSQL\…\bin\`.

## Arranque de servicios para evaluación

**API (obligatorio `DB_NAME=gestionctp27_qa`):**

```bat
set DB_NAME=gestionctp27_qa
set DB_SSL=false
set DB_HOST=127.0.0.1
set PORT=4010
set CORS_ORIGIN=http://localhost:3000
set FRONTEND_URL=http://localhost:3000
set COOKIE_SECURE=false
pnpm start:dev
```

**Frontend:**

```bat
set NEXT_PUBLIC_API_URL=http://localhost:4010
set PORT=3000
pnpm dev
```

El `.env` del backend suele apuntar a `gestionctp27`: **no confíe en el default** para estas sesiones.

## Qué no hacer

- `DROP DATABASE` sin respaldo.
- Ejecutar prepare contra otra BD.
- Borrar siembras/animales a mano sin revisar FKs.
- Ampliar permisos de la Directora para “facilitar” USAB-09.
