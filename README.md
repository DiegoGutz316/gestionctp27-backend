# gestionctp27-backend

API del sistema web de gestión para un Colegio Técnico Profesional (GestiónCTP27).
Este repositorio contiene únicamente la **estructura base** del backend: todavía no
hay funcionalidad de negocio implementada.

## Stack

- [NestJS](https://nestjs.com/) con TypeScript estricto
- [TypeORM](https://typeorm.io/) con PostgreSQL (migraciones, `synchronize: false`)
- [nestjs-zod](https://github.com/BenLorantfy/nestjs-zod) + [Zod](https://zod.dev/) para validación
- Gestor de paquetes: **pnpm**

## Estructura

```
src/
├── modules/
│   ├── usuarios/      ├── pecuaria/     ├── agricola/
│   ├── inventario/    ├── reportes/     └── dashboard/
│         (cada módulo: controllers/ services/ entities/ dto/ — placeholders)
├── migrations/    (migraciones de TypeORM)
├── schemas/       (esquemas Zod — mantener sincronizados con el frontend)
├── data-source.ts (DataSource para la CLI de TypeORM)
├── app.module.ts
└── main.ts
```

> **Nota:** los esquemas de `src/schemas/` deben mantenerse sincronizados
> manualmente con los del repositorio `gestionctp27-frontend`.

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

Variables: conexión a PostgreSQL (`DB_HOST`, `DB_PORT`, `DB_USERNAME`,
`DB_PASSWORD`, `DB_NAME`), puerto de la API (`PORT`) y origen permitido para
CORS (`CORS_ORIGIN`, la URL del frontend).

## Comandos

```bash
pnpm start:dev          # levantar en modo desarrollo (watch)
pnpm build              # compilar
pnpm start:prod         # correr la versión compilada
pnpm lint               # lint
pnpm test               # tests unitarios

# Migraciones (requieren BD accesible y .env configurado)
pnpm migration:generate src/migrations/NombreDeLaMigracion
pnpm migration:create   src/migrations/NombreDeLaMigracion
pnpm migration:run
pnpm migration:revert
```

## Despliegue

Backend desplegado en Railway, conectado a este repositorio.
