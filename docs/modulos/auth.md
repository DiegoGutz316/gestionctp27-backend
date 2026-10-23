# Módulo Auth

**Ruta:** `src/modules/auth`  
**Propósito:** Sesiones JWT en cookie, bloqueo por intentos fallidos y matriz de permisos por rol.

No hay registro público: los usuarios los crea un administrador vía `POST /usuarios`.

## Entidades

### `PermisoRol` → `permisos_rol`

| Campo | Descripción |
|-------|-------------|
| `rol`, `modulo`, `nivel` | Único `(rol, modulo)` |
| `creadoEn`, `actualizadoEn` | Auditoría |

### `IntentoLogin` → `intentos_login`

| Campo | Descripción |
|-------|-------------|
| `correo` | Clave de seguimiento |
| `intentosFallidos` | Contador |
| `bloqueadoHasta` | Ventana de bloqueo |

## Endpoints

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `POST` | `/auth/login` | `@Publico`, throttle 5/min | Cookie JWT; body `{ expiraEn, usuario }` |
| `POST` | `/auth/logout` | `@Publico` | Limpia cookie |
| `GET` | `/auth/perfil` | JWT | Usuario autenticado |
| `GET` | `/auth/permisos` | JWT | `{ rol, permisos }` |

### DTO login

`LoginDto`: `correo`, `contrasena` (correo normalizado a minúsculas).

## Servicios

### `AuthService`

- `login` / validación de credenciales
- Hash bcrypt (costo 12 vía usuarios)
- Opciones de cookie: `httpOnly`, `path: /`, `secure` / `sameSite` desde env, `maxAge` según `JWT_EXPIRACION`

### `IntentosLoginService`

- Máximo **5** fallos → bloqueo **10 minutos**
- Retención de intentos **60 minutos**
- `segundosRestantes`, `registrarFallo`, `limpiar`

### `PermisosService`

- `nivelDe`, `puede`, `matrizDe`
- Caché en memoria ~60 s; fallo → `NINGUNO` (fail-closed)
- `invalidarCache`

## Guards y decoradores

| Pieza | Comportamiento |
|-------|----------------|
| `JwtAuthGuard` | Exige JWT salvo `@Publico()` |
| `JwtStrategy` | Cookie primero, luego Bearer; recarga usuario; rechaza inactivo |
| `RolesGuard` | `@Roles(...)` |
| `PermisosGuard` | `@RequierePermiso(modulo, nivel)` |
| `@UsuarioActual` | Inyecta usuario del request |

Payload JWT: `sub`, `correo`, `nombre`, `rol`. Issuer: `gestionctp27`.

## Reglas de negocio (login)

1. Si está bloqueado → rechazo inmediato.
2. Correo desconocido → compare bcrypt dummy + cuenta fallo (sin enumeración de usuarios).
3. Contraseña incorrecta → cuenta fallo.
4. Correcta → limpia intentos; si `activo === false` → rechazo.
5. Emite JWT, actualiza `ultimoAcceso`.
6. Mensaje genérico: “El correo o la contraseña no son correctos.”

## Dependencias

Importa `UsuariosModule`. Exporta `AuthService`, `PermisosService`.
