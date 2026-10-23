# Módulo Comunicación

**Ruta:** `src/modules/comunicacion`  
**Propósito:** Avisos institucionales (Feature / Backlog 5.5–5.7) con flyer opcional.  
**Permiso de gestión:** módulo `REPORTES` + niveles LECTURA/COMPLETO (los avisos reutilizan ese módulo en la matriz).

## Entidad `Aviso` → `avisos`

| Campo | Notas |
|-------|--------|
| `id` | serial |
| `titulo`, `descripcion` | |
| `categoria` | nullable varchar; enum de dominio abajo |
| `fecha` | date (puede ser futura) |
| `estado` | `ACTIVO` \| `INACTIVO` |
| `flyer` | bytea, `select: false` |
| `flyerTipo` | mime |
| Auditoría | `creadoEn/Por`, `actualizadoEn/Por` |

**`CategoriaAviso`:** `ACADEMICOS`, `EVENTOS`, `COMUNIDAD`, `ADMINISTRATIVOS`

## Endpoints — `/comunicacion/avisos`

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `GET` | `/comunicacion/avisos` | LECTURA | Listado; no-admins solo activos |
| `GET` | `/comunicacion/avisos/publicos` | `@Publico` | Solo activos, forma pública |
| `POST` | `/comunicacion/avisos` | COMPLETO | Publicar |
| `GET` | `/comunicacion/avisos/:id` | COMPLETO | Detalle gestión |
| `PATCH` | `/comunicacion/avisos/:id` | COMPLETO | Editar |
| `PATCH` | `/comunicacion/avisos/:id/desactivar` | COMPLETO | Soft deactivate |
| `GET` | `/comunicacion/avisos/:id/flyer` | `@Publico` | Flyer de aviso activo |
| `GET` | `/comunicacion/avisos/:id/flyer/gestion` | LECTURA | Incluye inactivos |
| `PUT` | `/comunicacion/avisos/:id/flyer` | COMPLETO | Multipart campo `flyer` ≤ 5 MB |
| `DELETE` | `/comunicacion/avisos/:id/flyer` | COMPLETO | Quitar flyer |

## DTOs

- **RegistrarAvisoDto:** `titulo`, `descripcion`, `categoria`, `fecha`, `estado?`
- **EditarAvisoDto:** mismos campos + `estado` requerido
- **ConsultarAvisosDto:** `pagina`, `limite`, `estado?` (`ACTIVO`\|`INACTIVO`\|`TODOS`), `q?`, `categoria?`

## Reglas de negocio

1. Autor (`creadoPor`) solo desde JWT.
2. Lectores no admin forzados a `ACTIVO`; pedir `INACTIVO` → resultado vacío.
3. Desactivación lógica; ya inactivo → conflicto.
4. Flyer: jpeg/png/webp (jpg→jpeg), máximo 5 MB; updates con `update()` para no pisar `bytea` con `select: false`.
5. Orden: `fecha DESC`, `id DESC`.
6. Vista pública: sin autores; incluye `tieneFlyer` y `creadoEn` ISO.

## Dependencias

`TypeOrmModule.forFeature([Aviso])` + `AuthModule` (`PermisosService` para distinguir admin vs lector en consultas).
