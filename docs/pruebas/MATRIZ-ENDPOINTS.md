# Matriz de endpoints y pruebas

90 endpoints en 24 controllers. Todos cuentan con prueba HTTP (ruta real +
validación + guards) y, cuando delegan lógica no trivial, con prueba de su
service.

**Permiso** = nivel exigido por `PermisosGuard` sobre un módulo de la matriz
(`LECTURA` ⊂ `COMPLETO`). **Pública** = marcada `@Publico()`. Los roles son
`ADMINISTRADOR` (A), `DIRECTORA` (D), `DOCENTE_PECUARIO` (DP),
`DOCENTE_AGRICOLA` (DA) y `ESTUDIANTE` (E).

Matriz vigente usada por las pruebas:

| Módulo | A | D | DP | DA | E |
|---|---|---|---|---|---|
| PANEL | C | L | L | L | L |
| USUARIOS | C | – | – | – | – |
| PECUARIA | C | L | C | – | L |
| AGRICOLA | C | L | – | C | L |
| INVENTARIO | C | L | C | C | L |
| LIBRO_CAJA | C | L | C | C | – |
| REPORTES | C | L | C | C | – |

(C = COMPLETO, L = LECTURA, – = NINGUNO)

> Los 403 que se prueban a nivel de controller son los del `PermisosGuard`
> (módulo/nivel). Hay una segunda capa de autorización dentro de los services
> (`InventarioPolicy`, `LibroCajaPolicy`, restricción por departamento); sus
> 403 se prueban en los specs de service.

## Autenticación y raíz

| Método | Ruta | Acceso | Pruebas de endpoint | Pruebas de service |
|---|---|---|---|---|
| GET | `/` | Pública | `app.controller.endpoints.spec.ts` | `app.controller.spec.ts` (existente) |
| POST | `/auth/login` | Pública (throttle 5/min) | `auth.controller.spec.ts` | `auth.service.spec.ts`, `intentos-login.service.spec.ts`, `cookie-auth.spec.ts` |
| POST | `/auth/logout` | Pública | `auth.controller.spec.ts` | `auth.service.spec.ts` |
| GET | `/auth/perfil` | Sesión | `auth.controller.spec.ts` | `jwt.strategy.spec.ts` (autenticación real) |
| GET | `/auth/permisos` | Sesión | `auth.controller.spec.ts` | `permisos.service.spec.ts` |

## Usuarios — `USUARIOS` (solo ADMINISTRADOR)

| Método | Ruta | Permiso | Endpoint | Service |
|---|---|---|---|---|
| POST | `/usuarios` | COMPLETO | `usuarios.controller.spec.ts` | `usuarios.service.spec.ts` |
| GET | `/usuarios` | LECTURA | ídem | ídem |
| GET | `/usuarios/:id` (UUID) | LECTURA | ídem | ídem |
| PATCH | `/usuarios/:id/desactivar` | COMPLETO | ídem | ídem |
| PATCH | `/usuarios/:id` | COMPLETO | ídem | ídem |

## Pecuaria — `PECUARIA`

| Método | Ruta | Permiso | Endpoint | Service |
|---|---|---|---|---|
| POST | `/pecuaria/animales` | COMPLETO | `animal.controller.spec.ts` | `animal.service.spec.ts` |
| GET | `/pecuaria/animales` | LECTURA | ídem | ídem |
| GET | `/pecuaria/animales/:id` | LECTURA | ídem | ídem |
| PATCH | `/pecuaria/animales/:id` | COMPLETO | ídem | ídem |
| PATCH | `/pecuaria/animales/:id/desactivar` | COMPLETO | ídem | ídem |
| POST | `/pecuaria/vacunas` | COMPLETO | `vacuna.controller.spec.ts` | `vacuna.desparasitacion.service.spec.ts`, `vacuna.service.spec.ts` |
| GET | `/pecuaria/vacunas/animal/:animalId` | LECTURA | ídem | ídem |
| POST | `/pecuaria/desparasitaciones` | COMPLETO | `desparasitacion.controller.spec.ts` | `vacuna.desparasitacion.service.spec.ts`, `desparasitacion.service.spec.ts` |
| GET | `/pecuaria/animales/:animalId/desparasitaciones` | LECTURA | ídem | ídem |
| POST | `/pecuaria/salud` | COMPLETO | `salud.endpoints.spec.ts` | `salud.service.spec.ts` (existente) |
| GET | `/pecuaria/salud?animalId=` | LECTURA | ídem | ídem |
| POST | `/pecuaria/produccion` | COMPLETO | `produccion.controller.spec.ts` | `produccion.service.spec.ts` (existente) |
| GET | `/pecuaria/produccion?animalId=` | LECTURA | ídem | ídem |

## Agrícola — `AGRICOLA`

| Método | Ruta | Permiso | Endpoint | Service |
|---|---|---|---|---|
| POST | `/agricola/cultivos` | COMPLETO | `cultivo.controller.spec.ts` | `cultivo.service.spec.ts` |
| GET | `/agricola/cultivos` | LECTURA | ídem | ídem |
| GET | `/agricola/cultivos/:id` | LECTURA | ídem (aplica `mapearCultivo`) | ídem |
| PATCH | `/agricola/cultivos/:id` | COMPLETO | ídem | ídem |
| DELETE | `/agricola/cultivos/:id` (204) | COMPLETO | ídem | ídem |
| POST | `/agricola/camas` | COMPLETO | `cama-cultivo.controller.spec.ts` | `cama-cultivo.service.spec.ts` (existente) |
| GET | `/agricola/camas` | LECTURA | ídem | ídem |
| GET | `/agricola/camas/:id` | LECTURA | ídem | ídem |
| PATCH | `/agricola/camas/:id` | COMPLETO | ídem | ídem |
| DELETE | `/agricola/camas/:id` (204) | COMPLETO | ídem | `cama-cultivo.service.eliminar.spec.ts` |
| POST | `/agricola/siembras` | COMPLETO | `siembra.endpoints.spec.ts` | `siembra.service.endpoints.spec.ts`, `siembra.service.spec.ts` |
| PATCH | `/agricola/siembras/:id/finalizar` | COMPLETO | ídem | ídem |
| GET | `/agricola/siembras` | LECTURA | ídem | ídem |
| GET | `/agricola/siembras/:id` | LECTURA | ídem | ídem |
| POST | `/agricola/tratamientos` | COMPLETO | `tratamiento.controller.spec.ts` | `tratamiento.service.spec.ts` |
| GET | `/agricola/tratamientos` | LECTURA | ídem | ídem |
| POST | `/agricola/cosechas` | COMPLETO | `cosecha.controller.spec.ts` | `cosecha.service.spec.ts` |
| GET | `/agricola/cosechas` | LECTURA | ídem | ídem |

## Inventario — `INVENTARIO`

| Método | Ruta | Permiso | Endpoint | Service |
|---|---|---|---|---|
| GET | `/inventario/productos` | LECTURA | `producto.controller.spec.ts` | `producto.service.spec.ts` |
| POST | `/inventario/productos` | COMPLETO (+ ADMIN en service) | ídem | ídem |
| GET | `/inventario/productos/:id` | LECTURA | ídem | ídem |
| PATCH | `/inventario/productos/:id` | COMPLETO (+ ADMIN en service) | ídem | ídem |
| POST | `/inventario/configuracion-stock` | COMPLETO (+ ADMIN en service) | `stock.controller.spec.ts` | `stock.service.endpoints.spec.ts` |
| GET | `/inventario/configuracion-stock/:id` | LECTURA | ídem | ídem |
| PATCH | `/inventario/configuracion-stock/:id` | COMPLETO (+ ADMIN en service) | ídem | ídem |
| GET | `/inventario/existencias` | LECTURA | ídem | ídem |
| GET | `/inventario/existencias/movimientos` | LECTURA | ídem | ídem |
| GET | `/inventario/existencias/:id` | LECTURA | ídem | ídem |
| POST | `/inventario/existencias/:id/entradas` | COMPLETO + `Idempotency-Key` | ídem | `stock.service.endpoints.spec.ts`, `stock.service.spec.ts`, `stock-notificaciones.service.spec.ts` |
| POST | `/inventario/existencias/:id/salidas` | COMPLETO + `Idempotency-Key` | ídem | ídem |

## Libro de caja — `LIBRO_CAJA`

| Método | Ruta | Permiso | Endpoint | Service |
|---|---|---|---|---|
| GET | `/libro-caja/colegio` | LECTURA | `colegio.controller.spec.ts` | `colegio.service.spec.ts` |
| PUT | `/libro-caja/colegio` | COMPLETO (+ ADMIN en service) | ídem | ídem |
| GET | `/libro-caja/departamentos` | LECTURA | `departamento.controller.spec.ts` | `departamento.service.spec.ts` |
| POST | `/libro-caja/departamentos` | COMPLETO (+ ADMIN en service) | ídem | ídem |
| GET | `/libro-caja/departamentos/:id` | LECTURA | ídem | ídem |
| PATCH | `/libro-caja/departamentos/:id/desactivar` | COMPLETO (+ ADMIN en service) | ídem | ídem |
| PATCH | `/libro-caja/departamentos/:id` | COMPLETO (+ ADMIN en service) | ídem | ídem |
| GET | `/libro-caja/periodos` | LECTURA | `periodo.controller.spec.ts` | `periodo.service.endpoints.spec.ts`, `periodo.service.spec.ts` |
| POST | `/libro-caja/periodos` | COMPLETO (+ ADMIN en service) | ídem | ídem |
| GET | `/libro-caja/periodos/:id` | LECTURA | ídem | ídem |
| PATCH | `/libro-caja/periodos/:id` | COMPLETO (+ ADMIN en service) | ídem | ídem |
| POST | `/libro-caja/periodos/:id/cerrar` | COMPLETO (+ ADMIN en service) | ídem | ídem |
| POST | `/libro-caja/periodos/:id/fondos/:fondoId/solicitar` | COMPLETO (+ docente/ADMIN en service) | ídem | ídem |
| PATCH | `/libro-caja/periodos/:id/fondos/:fondoId/informe` | LECTURA (+ política en service) | ídem | ídem |
| GET | `…/periodos/:periodoId/fondos/:fondoId/asientos` | LECTURA | `asiento.controller.spec.ts` | `asiento.service.endpoints.spec.ts`, `asiento.service.spec.ts` |
| POST | `…/asientos` | COMPLETO + `Idempotency-Key` | ídem | ídem |
| PATCH | `…/asientos/:asientoId` | COMPLETO | ídem | ídem |
| DELETE | `…/asientos/:asientoId` | COMPLETO | ídem | ídem |

## Reportes y comunicación — `REPORTES`

| Método | Ruta | Permiso | Endpoint | Service |
|---|---|---|---|---|
| GET | `/reportes/produccion-pecuaria` | LECTURA | `reporte-produccion-pecuaria.endpoints.spec.ts` | `…service.spec.ts` (existente) |
| GET | `/reportes/produccion-agricola` | LECTURA | `reporte-produccion-agricola.endpoints.spec.ts` | `…service.spec.ts` (existente) |
| GET | `/reportes/inventario` | LECTURA | `reporte-inventario.controller.spec.ts` | `…service.spec.ts` (existente) |
| GET | `/reportes/exportacion/produccion-pecuaria/pdf` | LECTURA | `exportacion-reportes.controller.spec.ts` (verifica `%PDF` y cabeceras) | PDF/Excel reales |
| GET | `/reportes/exportacion/produccion-pecuaria/excel` | LECTURA | ídem (verifica contenedor `PK` .xlsx) | ídem |
| GET | `/reportes/exportacion/produccion-agricola/pdf` | LECTURA | ídem | ídem |
| GET | `/reportes/exportacion/produccion-agricola/excel` | LECTURA | ídem | ídem |
| GET | `/reportes/exportacion/inventario/pdf` | LECTURA | ídem | ídem |
| GET | `/reportes/exportacion/inventario/excel` | LECTURA | ídem | ídem |
| GET | `/comunicacion/avisos` | LECTURA (`puedeAdministrar` según rol) | `aviso.controller.spec.ts` | `aviso.service.endpoints.spec.ts`, `aviso.service.spec.ts` |
| GET | `/comunicacion/avisos/publicos` | Pública | ídem | ídem |
| POST | `/comunicacion/avisos` | COMPLETO | ídem | ídem |
| PATCH | `/comunicacion/avisos/:id/desactivar` | COMPLETO | ídem | ídem |
| GET | `/comunicacion/avisos/:id/flyer/gestion` | LECTURA | ídem | ídem |
| GET | `/comunicacion/avisos/:id/flyer` | Pública | ídem | ídem |
| PUT | `/comunicacion/avisos/:id/flyer` (multipart, ≤5 MB) | COMPLETO | ídem | ídem |
| DELETE | `/comunicacion/avisos/:id/flyer` | COMPLETO | ídem | ídem |
| GET | `/comunicacion/avisos/:id` | COMPLETO | ídem | ídem |
| PATCH | `/comunicacion/avisos/:id` | COMPLETO | ídem | ídem |

## Transversal (aplica a todos los endpoints)

| Componente | Spec |
|---|---|
| `OriginCsrfGuard` (mutaciones: Origin/Referer, 415 para cuerpos no JSON/multipart) | `origin-csrf.guard.class.spec.ts`, `origin-csrf.guard.spec.ts` (existente) |
| `JwtAuthGuard`, `RolesGuard`, `@UsuarioActual` | `guards.spec.ts` |
| `PermisosGuard` (403 por módulo/nivel) | ejercitado real en todos los specs de endpoint |
| `JwtStrategy` (cookie/Bearer, expiración, firma, usuario activo, rol desde BD) | `jwt.strategy.spec.ts` |
| `ValidationPipe` global (`whitelist` + `forbidNonWhitelisted`) | ejercitado real en todos los specs de endpoint |
| `MailService` (Brevo) | `mail.service.spec.ts` |
