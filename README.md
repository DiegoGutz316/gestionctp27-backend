# gestionctp27-backend

API del sistema web de gestión para un Colegio Técnico Profesional (GestiónCTP27).
Este repositorio contiene únicamente la **estructura base** del backend: todavía no
hay funcionalidad de negocio implementada.

## Stack

- [NestJS](https://nestjs.com/) con TypeScript estricto
- [TypeORM](https://typeorm.io/) con PostgreSQL (migraciones, `synchronize: false`)
- [class-validator](https://github.com/typestack/class-validator) y
  [class-transformer](https://github.com/typestack/class-transformer) para validación
- Gestor de paquetes: **pnpm**

## Estructura

```
src/
├── modules/
│   ├── usuarios/      ├── pecuaria/     ├── agricola/
│   ├── inventario/    ├── reportes/     └── dashboard/
│         (cada módulo: *.controller.ts *.service.ts entities/ dto/ enums/)
├── database/
│   ├── data-source.ts     (DataSource para la CLI de TypeORM)
│   ├── database.config.ts (opciones de conexión compartidas app/CLI)
│   └── migrations/        (migraciones de TypeORM)
├── app.module.ts
└── main.ts
```

## Requisitos

- Node.js 20+
- pnpm
- PostgreSQL (opcional para arrancar: la API inicia aunque la BD no esté disponible)

## Instalación

```bash
pnpm install
```

## Configuración

Copiar `.env.example` a `.env` y completar los valores:

```bash
cp .env.example .env
```

Variables: conexión a PostgreSQL (`DATABASE_URL`, o bien `DB_HOST`, `DB_PORT`,
`DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`), SSL (`DB_SSL`), puerto de la API
(`PORT`) y origen permitido para CORS (`CORS_ORIGIN`, la URL del frontend).

### Conexión con Supabase

1. En el dashboard de Supabase: **Connect → Session pooler** (usar el pooler de
   sesión, puerto 5432, compatible con IPv4 y con las migraciones de TypeORM).
2. Copiar la cadena de conexión en `DATABASE_URL` (si la contraseña tiene
   caracteres especiales como `%` o `@`, van URL-encoded).
3. Dejar `DB_SSL=true` (Supabase exige SSL).

Con `DATABASE_URL` definida, las variables `DB_HOST`/`DB_PORT`/etc. se ignoran.

## Comandos

```bash
pnpm start:dev          # levantar en modo desarrollo (watch)
pnpm build              # compilar
pnpm start:prod         # correr la versión compilada
pnpm lint               # lint
pnpm test               # tests unitarios

# Migraciones (requieren BD accesible y .env configurado)
pnpm migration:generate src/database/migrations/NombreDeLaMigracion
pnpm migration:create   src/database/migrations/NombreDeLaMigracion
pnpm migration:run
pnpm migration:revert
```

## Despliegue

Backend desplegado en Railway, conectado a este repositorio.
