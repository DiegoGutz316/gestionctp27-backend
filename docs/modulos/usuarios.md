# Módulo Usuarios

**Ruta:** `src/modules/usuarios`  
**Propósito:** Alta, consulta, edición y desactivación lógica de usuarios del sistema.  
**Permiso:** `USUARIOS` (COMPLETO escribir / LECTURA listar-detalle).

## Entidad `Usuario` → `usuarios`

| Campo | Notas |
|-------|--------|
| `id` | UUID PK |
| `nombre` | varchar(120) |
| `correo` | unique, normalizado a minúsculas |
| `contrasenaHash` | `select: false`; bcrypt costo 12 |
| `rol` | enum `RolUsuario` |
| `rolAsignadoEn` | Se actualiza al crear o cambiar rol |
| `activo` | default true |
| `ultimoAcceso` | |
| `creadoEn` / `actualizadoEn` | |
| `creadoPor` / `actualizadoPor` | UUID nullable |

### `RolUsuario`

`ADMINISTRADOR` | `DIRECTORA` | `DOCENTE_PECUARIO` | `DOCENTE_AGRICOLA` | `ESTUDIANTE`

## Endpoints

| Método | Ruta | Permiso | Acción |
|--------|------|---------|--------|
| `POST` | `/usuarios` | COMPLETO | Crear |
| `GET` | `/usuarios` | LECTURA | Listar paginado |
| `GET` | `/usuarios/:id` | LECTURA | Detalle |
| `PATCH` | `/usuarios/:id` | COMPLETO | Actualizar |
| `PATCH` | `/usuarios/:id/desactivar` | COMPLETO | Soft deactivate |

Query: `pagina`, `limite`, `q` (nombre/correo), `rol`, `activo`, `order` ASC|DESC por nombre.

## DTOs

- **CrearUsuarioDto:** `nombre`, `correo`, `contrasena` (8–72), `rol`, `activo?`
- **EditarUsuarioDto:** campos editables + `activo` requerido; `contrasena` opcional
- **PaginarUsuariosDto:** extiende `PaginarDto`

## Reglas de negocio

1. Correo único (validación app + error PG `23505`).
2. Hash nunca se expone en respuestas.
3. Un admin **no** puede rebajarse el rol a sí mismo ni desactivarse a sí mismo.
4. No se puede desactivar / rebajar al **último administrador activo**.
5. Desactivación lógica (`activo = false`); ya inactivo → 400.
6. Métodos internos para Auth: `buscarParaAutenticar`, `buscarPorId`, `registrarUltimoAcceso`.

## Dependencias

Exportado hacia `AuthModule`. Controllers usan decoradores de auth (guards globales).
