# Stack y arquitectura

## Stack de herramientas

| Área | Tecnología | Notas |
|------|------------|--------|
| Runtime / framework | NestJS 11 + Express | TypeScript 5.7 |
| ORM / BD | TypeORM + PostgreSQL (`pg`) | Supabase (session pooler); `synchronize: false` |
| Auth | JWT (`@nestjs/jwt`), Passport JWT, bcrypt, cookie-parser | Cookie httpOnly `ctp27_access_token` |
| Validación | class-validator + class-transformer | `ValidationPipe` global |
| Config | `@nestjs/config` | `.env` / `.env.example` |
| Rate limiting | `@nestjs/throttler` | 20 req/min global; login 5/min |
| API docs | `@nestjs/swagger` | UI en `/api` |
| Reportes | pdfkit, exceljs | PDF y Excel |
| Uploads | multer | Flyers de avisos (≤ 5 MB) |
| Correo | Brevo API v3 | Alertas de stock mínimo |
| Gestor de paquetes | **pnpm** (exclusivo) | |
| Tests | Jest + Supertest | Unitarios y e2e |
| Lint / format | ESLint 9, Prettier | |
| Deploy | Railway (principal); Vercel serverless opcional | `api/index.js` |

### Variables de entorno (nombres)

Ver `.env.example`:

- **BD:** `DATABASE_URL` o `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME`, `DB_SSL`
- **API:** `PORT` (default `4000`)
- **CORS:** `CORS_ORIGIN`, opcional `CORS_ORIGINS` (lista separada por comas)
- **Auth:** `JWT_SECRET`, `JWT_EXPIRACION`, `COOKIE_SECURE`, `COOKIE_SAME_SITE`
- **Mail:** `BREVO_API_KEY`, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME`

## Estructura del proyecto

```
src/
├── main.ts                 # Bootstrap HTTP (cookies, CORS, Swagger)
├── app.module.ts           # Módulos globales, TypeORM, guards
├── app.controller.ts       # GET / (público)
├── common/                 # CORS/CSRF, paginación, validadores, mail
├── database/               # Config TypeORM, DataSource CLI, migrations, seeds
└── modules/
    ├── auth/
    ├── usuarios/
    ├── agricola/           # cultivo, cama, siembra, tratamiento, cosecha
    ├── pecuaria/           # animal, vacuna, desparasitacion, salud, produccion
    ├── inventario/         # producto, stock
    ├── libro-caja/         # colegio, departamento, periodo (+ asientos)
    ├── reportes/           # producción pecuaria/agrícola, inventario, export
    ├── comunicacion/       # avisos + flyers
    └── dashboard/          # placeholder
```

Convención por módulo: `*.controller.ts`, `*.service.ts`, `entities/`, `dto/`, `enums/`.

## Bootstrap (`main.ts` / `app.module.ts`)

1. `cookieParser()`
2. CORS con credenciales; headers `Content-Type`, `Authorization`, `Idempotency-Key`; expone `Content-Disposition`
3. Swagger en `/api` (cookie + Bearer)
4. Escucha en `PORT` o `4000`

### Providers globales

| Orden | Guard / pipe | Rol |
|-------|--------------|-----|
| — | `ValidationPipe` | `transform`, `whitelist`, `forbidNonWhitelisted` |
| 1 | `ThrottlerGuard` | Rate limit |
| 2 | `OriginCsrfGuard` | Métodos inseguros: Origin/Referer vs allowlist si hay cookie |
| 3 | `JwtAuthGuard` | JWT obligatorio salvo `@Publico()` |
| 4 | `RolesGuard` | `@Roles(...)` opcional |
| 5 | `PermisosGuard` | `@RequierePermiso(modulo, nivel)` |

TypeORM: `autoLoadEntities`, `migrationsRun: false`. Si la BD no conecta, la API **sigue arrancando** (stub de `initialize` + warning).

## Capas compartidas (`common/`)

| Pieza | Uso |
|-------|-----|
| `http/origenes-permitidos.ts` | Parseo de orígenes CORS |
| `http/origin-csrf.guard.ts` | CSRF por Origin/Referer |
| `paginacion/*` | `pagina`, `limite` (máx 100), `q`; `ResultadoPaginado` |
| `validacion/fecha-no-futura.validator.ts` | Fecha `AAAA-MM-DD` ≤ hoy (America/Costa_Rica) |
| `mail/*` | Módulo global Brevo; no-op si falta API key |

No hay entidad base compartida: los campos de auditoría (`creadoEn`, `creadoPor`, etc.) se definen por entidad.

## Base de datos

- PostgreSQL en Supabase (recomendado: session pooler puerto 5432 + `DB_SSL=true`)
- Esquema **solo por migraciones** (`src/database/migrations/`)
- CLI: `src/database/data-source.ts`
- Scripts: `migration:generate|create|run|revert|check`
- `pnpm predeploy` = build + `migration:check` (no aplica migraciones)
- Seed: `pnpm seed:usuarios`

Reglas críticas en BD (inventario):

- Trigger `trg_aplicar_movimiento_stock` actualiza `inventario.cantidad` al insertar movimiento
- Movimientos inmutables (sin UPDATE/DELETE)
- Cantidad de existencia no se escribe desde la API

## Comandos habituales

```bash
pnpm install
pnpm start:dev
pnpm build && pnpm start:prod
pnpm lint
pnpm test
pnpm migration:run
pnpm seed:usuarios
```

## Despliegue

- **Railway:** despliegue principal del backend
- **Vercel (opcional):** `vercel.json` + `api/index.js` (handler Express cacheado, `maxDuration` 30s)
- **No Docker** en este proyecto
