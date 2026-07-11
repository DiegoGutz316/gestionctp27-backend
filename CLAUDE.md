# CLAUDE.md — gestionctp27-backend

API (NestJS + TypeORM/PostgreSQL + nestjs-zod) del sistema de gestión para un
Colegio Técnico Profesional. Repositorio independiente del frontend
(`gestionctp27-frontend`).

## Reglas del proyecto

- Gestor de paquetes: **pnpm** exclusivamente.
- TypeScript estricto; validación con Zod vía `nestjs-zod` (pipe global ya configurado).
- TypeORM con `synchronize: false`; todo cambio de esquema va por migraciones
  (`pnpm migration:generate src/migrations/Nombre`, `pnpm migration:run`).
- Los esquemas Zod viven en `src/schemas/` y deben mantenerse **sincronizados
  manualmente** con los de `gestionctp27-frontend/src/schemas/` (mismo día/PR).
- Arquitectura en capas por módulo: `controllers/`, `services/`, `entities/`, `dto/`
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
