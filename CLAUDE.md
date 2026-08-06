# CLAUDE.md — gestionctp27-backend

API (NestJS + TypeORM/PostgreSQL + class-validator) del sistema de gestión para un
Colegio Técnico Profesional. Repositorio independiente del frontend
(`gestionctp27-frontend`).

## Reglas del proyecto

- Gestor de paquetes: **pnpm** exclusivamente.
- TypeScript estricto; validación con `class-validator` y transformación con
  `class-transformer` mediante un pipe global.
- TypeORM con `synchronize: false`; todo cambio de esquema va por migraciones
  (`pnpm migration:generate src/database/migrations/Nombre`, `pnpm migration:run`).
- La configuración de BD vive en `src/database/` (`database.config.ts` comparte
  las opciones entre la app y la CLI). La BD es PostgreSQL en Supabase: se
  conecta con `DATABASE_URL` (session pooler) y `DB_SSL=true`.
- Las validaciones de entrada viven en las clases de `dto/`; los enums de dominio
  viven en la carpeta `enums/` de su módulo correspondiente.
- Arquitectura en capas por módulo: `controllers/`, `services/`, `entities/`, `dto/`, `enums/`
  dentro de cada módulo en `src/modules/` (`usuarios`, `pecuaria`, `agricola`,
  `inventario`, `reportes`, `dashboard`).
- No usar Docker en este proyecto.
- La API debe poder compilar y arrancar aunque la BD no esté disponible.

## Comandos

- `pnpm start:dev` — desarrollo con watch
- `pnpm build` / `pnpm start:prod`
- `pnpm lint`, `pnpm test`

## Despliegue

Railway (backend) — el frontend se despliega en Vercel desde su propio repositorio.
