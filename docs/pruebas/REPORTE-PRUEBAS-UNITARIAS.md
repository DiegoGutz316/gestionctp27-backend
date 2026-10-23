# Reporte de pruebas unitarias — Backend GestiónCTP27

| | |
|---|---|
| **Proyecto** | `gestionctp27-backend` (NestJS 11 + TypeORM + PostgreSQL) |
| **Fecha** | 2026-10-23 |
| **Alcance** | Los 90 endpoints del sistema (24 controllers) y la lógica de negocio que los respalda |
| **Resultado** | **1471 de 1471 pruebas aprobadas**, 95 suites, ~6 s |
| **Cobertura** | 80,3 % sentencias · 79,5 % ramas · 78,0 % funciones · 80,5 % líneas |
| **Código de producción modificado** | Ninguno |

## 1. Resumen ejecutivo

- Se pasó de **224 pruebas / 47 suites** a **1471 pruebas / 95 suites** (+1247 pruebas en 48 suites nuevas).
- La cobertura global subió de **37,3 % a 80,3 %** (sentencias). **Los 24 controllers quedaron en 100 %** de sentencias (el de avisos en 95,7 %: solo falta un filtro de excepciones que nunca se ejecuta, ver H-01).
- Cada endpoint se prueba **por la ruta HTTP real**: verbo, path, pipes, `ValidationPipe` estricto, DTO y guards de rol y permisos con la matriz vigente. Se comprueba el camino feliz por cada rol autorizado, el 401 sin sesión, el 403 para cada rol sin permiso y los 400 por entradas inválidas.
- Se probó la lógica de negocio de 20 services que antes tenían 10–40 % de cobertura o ninguna (usuarios, auth, permisos, bloqueo de login, productos, stock, periodos, asientos, siembras, cosechas…), incluida la autenticación JWT real.
- Las pruebas encontraron **6 hallazgos** (ninguno crítico): 1 código muerto con efecto visible, 1 regla de negocio no aplicada, 2 de seguridad menor y 2 de integridad/consistencia. Están documentados en la sección 4 y fijados en tests marcados `H-0x`.

## 2. Qué se hizo

### 2.1 Metodología

Tres niveles (detalle en el [README](./README.md)):

1. **Endpoint (HTTP):** controller real + `ValidationPipe`, `RolesGuard` y `PermisosGuard` reales; solo se simula el service. Una batería estándar por endpoint, generada de una tabla declarativa (`test/helpers/tabla-endpoints.ts`), más casos específicos (multipart, descargas PDF/Excel con verificación de bytes, cookies).
2. **Servicio:** reglas de negocio con repositorios, `DataSource` y `EntityManager` simulados: validaciones, conflictos (409), concurrencia (violaciones `UNIQUE` → 409), transacciones, auditoría, idempotencia, políticas por rol y por departamento.
3. **Autenticación real:** `JwtStrategy` + `JwtAuthGuard` + passport-jwt con tokens firmados (cookie, Bearer, expirado, firma ajena, `alg: none`, usuario desactivado, rol cambiado en BD).

Sin base de datos, red ni variables de entorno.

### 2.2 Antes y después

| Métrica | Antes | Después |
|---|---:|---:|
| Suites | 47 | 95 |
| Pruebas | 224 | 1471 |
| Sentencias | 37,3 % | 80,3 % |
| Ramas | 34,5 % | 79,5 % |
| Funciones | 31,8 % | 78,0 % |
| Líneas | 37,1 % | 80,5 % |
| Controllers con pruebas de endpoint | 0 de 24 (solo metadatos de permisos en 3) | 24 de 24 |

### 2.3 Cobertura por capa (sentencias)

| Capa | Cobertura |
|---|---|
| Controllers (24) | 100 % (aviso: 95,7 %) |
| Services con lógica de negocio | 92–100 % (el más bajo: `reporte-pdf.service` 92 %; `departamento.service` 95,6 %) |
| Guards, políticas y estrategia JWT | 96–100 % |
| DTO / validadores / mappers | 85–100 % (algunos `transformarNumero` duplicados quedan parciales). Dos archivos sin ningún uso quedan en 0 %: `usuarios/dto/consultar-usuarios.dto.ts` y `libro-caja/periodo/dto/dos-decimales.validator.ts` (ver O-4) |
| `main.ts`, `database/*`, migraciones, seed | 0 % (infraestructura; ver sección 5) |

Las migraciones (44 archivos) y la infraestructura de arranque explican casi todo el 20 % restante.

## 3. Resultados

Todas las pruebas aprobadas. La suite se ejecutó repetidamente (con y sin `--coverage`, en paralelo y con `--runInBand`) sin fallos intermitentes. Durante el trabajo apareció un timeout esporádico de 5 s causado por abrir y cerrar el servidor HTTP en cada petición de supertest; se resolvió haciendo que la app de pruebas escuche una sola vez en un puerto efímero (`test/helpers/endpoint-app.ts`).

Verificaciones adicionales:

- `pnpm test:e2e` (arranque de la app completa): 3 de 3 aprobadas.
- `eslint` sobre los archivos nuevos: sin errores ni advertencias.
- `tsc --noEmit`: sin errores en los archivos nuevos (ver observación O-1 sobre specs preexistentes).

## 4. Hallazgos

Severidad estimada: **Media** = incumple una regla documentada o de negocio; **Baja** = riesgo o inconsistencia menor. Ninguno bloquea el uso actual.

| ID | Sev. | Dónde | Descripción | Evidencia |
|---|---|---|---|---|
| **H-03** | Media | `SiembraService.registrar` | El catálogo documenta que «un cultivo inactivo deja de ofrecerse al sembrar», pero la API **sí permite sembrar un cultivo desactivado** (no se valida `cultivo.activo`). Solo la interfaz lo evita. | `siembra.service.endpoints.spec.ts` › «H-03 (comportamiento actual)» |
| **H-01** | Baja | `PUT /comunicacion/avisos/:id/flyer` | El filtro `ErrorDeFlyerFilter` (`@Catch(MulterError)`) **nunca se ejecuta**: Nest convierte el error de multer en `HttpException` antes. Un flyer > 5 MB responde **413** (no el 400 con «El flyer no puede superar 5 MB.») y un campo mal nombrado responde el mensaje de multer en inglés («Unexpected field - otro»). Si el frontend espera el 400/mensaje en español, no lo recibe. | `aviso.controller.spec.ts` › «413: archivo mayor a 5 MB (HALLAZGO H-01…)» |
| **H-02** | Baja | `AvisoService.guardarFlyer` | El tipo de imagen se valida **solo con el `Content-Type` declarado por el cliente**, sin comprobar los bytes. Un archivo no-imagen etiquetado `image/png` se guarda y luego se sirve en la ruta **pública** `GET …/flyer` con ese tipo. Requiere permiso `REPORTES: COMPLETO` (admin y docentes), por lo que el riesgo es bajo. | `aviso.service.endpoints.spec.ts` › «acepta image/png» (buffer arbitrario) |
| **H-04** | Baja | `StockNotificacionesService` | El nombre del producto se interpola **sin escapar** en el HTML del correo de stock bajo. Solo el administrador crea productos, pero el nombre llega íntegro al HTML enviado a otros administradores. | `stock-notificaciones.service.spec.ts` › «H-04 (comportamiento actual)» |
| **H-05** | Baja | `SiembraService.registrar` | La siembra se guarda y **después** la cama pasa a `SEMBRADA` en una operación separada, sin transacción. Si el segundo guardado falla, queda una siembra activa con la cama `DISPONIBLE`. Está mitigado por el índice único parcial y la verificación de siembra activa, que impiden una segunda siembra. (Contraste: `CosechaService.registrar` sí usa transacción.) | Revisión de código; `siembra.service.endpoints.spec.ts` |
| **H-06** | Baja | `PATCH /agricola/camas/:id` | Acepta cualquier `estado` (p. ej. `SEMBRADA` sin siembra, o `DISPONIBLE` con una siembra activa), sin relación con las siembras reales. La siembra activa sigue impidiendo una segunda, pero el estado mostrado puede quedar incoherente. | Revisión de código; `cama-cultivo.service.spec.ts` (existente) |

### Observaciones (no son defectos)

- **O-1 — Specs preexistentes con errores de tipos.** `tsc --noEmit` reporta 10 errores en 6 specs que ya estaban en el repo (`cama-cultivo.service.spec.ts`, `siembra.service.spec.ts`, `stock.service.spec.ts`, `asiento.service.spec.ts`, `periodo.service.spec.ts`, `reporte-inventario.service.spec.ts`): p. ej. `UnidadMedida.KG` que no existe en ese enum, o un DTO sin `unidadSembrada`. Jest los ejecuta igual porque `tsconfig.json` tiene `isolatedModules: true` y `ts-jest` no chequea tipos, y `nest build` excluye los specs, así que no afectan la compilación. Conviene corregirlos: en alguno la prueba compara contra `undefined` sin que se note. No se modificaron para no tocar trabajo ajeno.
- **O-2 — Doble capa de autorización.** Varios endpoints de escritura (`POST/PATCH` de productos, configuración de stock, colegio, departamentos, periodos) pasan el `PermisosGuard` para los docentes (tienen `COMPLETO` en el módulo) pero el service exige `ADMINISTRADOR` y responde 403. Es coherente con el diseño y está probado en ambas capas; implica que la interfaz debe ocultar esas acciones a los docentes para no mostrar errores.
- **O-3 — Límite de intentos de login.** El `@Throttle` (5/min por IP) es solo metadato: no se ejercita en las pruebas (no hay `ThrottlerGuard` en la app de pruebas). El bloqueo por correo (5 fallos → 10 min) sí está probado en `auth.service` e `intentos-login.service`.
- **O-4 — Código sin uso.** `usuarios/dto/consultar-usuarios.dto.ts` (`ConsultarUsuariosDto`) y `libro-caja/periodo/dto/dos-decimales.validator.ts` no son importados por ningún archivo; el controller de usuarios usa `PaginarUsuariosDto`. Son candidatos a eliminar.

## 5. Limitaciones y recomendaciones

**Lo que estas pruebas no pueden detectar** (la BD es simulada):

- Consultas SQL en bruto (p. ej. el *upsert* atómico de `intentos_login`), restricciones `UNIQUE`/`FOREIGN KEY`, índices parciales (`siembras_cama_activa_unica`), triggers y las 44 migraciones.
- Concurrencia real (bloqueos pesimistas, condiciones de carrera entre transacciones); solo se prueba que el código traduce correctamente los errores de la BD.
- El `@Throttle` y el orden real de los guards globales en `AppModule` (la app de prueba replica el pipe y los guards de permisos, no los registra desde `AppModule`).

**Recomendaciones, por prioridad:**

1. **Corregir H-03** (validar `cultivo.activo` al sembrar) y actualizar el test marcado.
2. **Decidir H-01:** quitar `ErrorDeFlyerFilter` o hacer que realmente aplique (p. ej. `@UseFilters` con `@Catch(HttpException)` sobre 413), y alinear al frontend.
3. **Validar los bytes del flyer** (firma mágica JPEG/PNG/WebP) y servir con `X-Content-Type-Options: nosniff` (H-02); escapar HTML en el correo (H-04).
4. **Agregar pruebas de integración contra PostgreSQL** (una BD efímera local, sin Docker si así se prefiere) para migraciones, restricciones e idempotencia concurrente; es el hueco que dejan las pruebas unitarias.
5. **Ejecutar `pnpm test` y `pnpm test:cov` en CI** y fijar un umbral mínimo de cobertura (p. ej. 75 % global, 90 % en services).
6. Corregir los errores de tipos de la observación O-1 y activar el chequeo de tipos de `ts-jest` (hoy `isolatedModules: true` en `tsconfig.json` lo omite) para que no vuelvan a pasar inadvertidos.
7. Eliminar el código sin uso de la observación O-4.

## 6. Archivos agregados

Solo archivos nuevos; no se editó código de producción ni specs existentes ni la configuración del proyecto.

- `test/helpers/endpoint-app.ts`, `tabla-endpoints.ts`, `typeorm-mocks.ts` — infraestructura de pruebas.
- 48 specs nuevos (listados abajo).
- `docs/pruebas/` — esta documentación.

> `docs/` ya contenía documentación técnica del backend (README, stack, módulos); esta carpeta se agregó sin modificar esos archivos.

### Pruebas nuevas por módulo

**app** (3 tests)

| Archivo | Tests |
|---|---:|
| `src/app.controller.endpoints.spec.ts` | 3 |

**common** (39 tests)

| Archivo | Tests |
|---|---:|
| `src/common/http/origin-csrf.guard.class.spec.ts` | 32 |
| `src/common/mail/mail.service.spec.ts` | 7 |

**agricola** (239 tests)

| Archivo | Tests |
|---|---:|
| `src/modules/agricola/cama/cama-cultivo.controller.spec.ts` | 41 |
| `src/modules/agricola/cama/cama-cultivo.service.eliminar.spec.ts` | 6 |
| `src/modules/agricola/cosecha/cosecha.controller.spec.ts` | 25 |
| `src/modules/agricola/cosecha/cosecha.service.spec.ts` | 10 |
| `src/modules/agricola/cultivo/cultivo.controller.spec.ts` | 42 |
| `src/modules/agricola/cultivo/cultivo.service.spec.ts` | 23 |
| `src/modules/agricola/siembra/siembra.endpoints.spec.ts` | 36 |
| `src/modules/agricola/siembra/siembra.service.endpoints.spec.ts` | 22 |
| `src/modules/agricola/tratamiento/tratamiento.controller.spec.ts` | 25 |
| `src/modules/agricola/tratamiento/tratamiento.service.spec.ts` | 9 |

**auth** (108 tests)

| Archivo | Tests |
|---|---:|
| `src/modules/auth/auth.controller.spec.ts` | 23 |
| `src/modules/auth/auth.service.spec.ts` | 14 |
| `src/modules/auth/constantes/cookie-auth.spec.ts` | 19 |
| `src/modules/auth/guards/guards.spec.ts` | 12 |
| `src/modules/auth/intentos-login.service.spec.ts` | 13 |
| `src/modules/auth/permisos.service.spec.ts` | 13 |
| `src/modules/auth/strategies/jwt.strategy.spec.ts` | 14 |

**comunicacion** (87 tests)

| Archivo | Tests |
|---|---:|
| `src/modules/comunicacion/aviso.controller.spec.ts` | 56 |
| `src/modules/comunicacion/aviso.service.endpoints.spec.ts` | 31 |

**inventario** (208 tests)

| Archivo | Tests |
|---|---:|
| `src/modules/inventario/producto/producto.controller.spec.ts` | 40 |
| `src/modules/inventario/producto/producto.service.spec.ts` | 38 |
| `src/modules/inventario/stock/stock-notificaciones.service.spec.ts` | 5 |
| `src/modules/inventario/stock/stock.controller.spec.ts` | 77 |
| `src/modules/inventario/stock/stock.service.endpoints.spec.ts` | 48 |

**libro-caja** (243 tests)

| Archivo | Tests |
|---|---:|
| `src/modules/libro-caja/colegio/colegio.controller.spec.ts` | 18 |
| `src/modules/libro-caja/colegio/colegio.service.spec.ts` | 9 |
| `src/modules/libro-caja/departamento/departamento.controller.spec.ts` | 41 |
| `src/modules/libro-caja/departamento/departamento.service.spec.ts` | 17 |
| `src/modules/libro-caja/periodo/asiento.controller.spec.ts` | 39 |
| `src/modules/libro-caja/periodo/asiento.service.endpoints.spec.ts` | 18 |
| `src/modules/libro-caja/periodo/periodo.controller.spec.ts` | 63 |
| `src/modules/libro-caja/periodo/periodo.service.endpoints.spec.ts` | 38 |

**pecuaria** (156 tests)

| Archivo | Tests |
|---|---:|
| `src/modules/pecuaria/animal/animal.controller.spec.ts` | 45 |
| `src/modules/pecuaria/animal/animal.service.spec.ts` | 18 |
| `src/modules/pecuaria/desparasitacion.controller.spec.ts` | 19 |
| `src/modules/pecuaria/produccion/produccion.controller.spec.ts` | 22 |
| `src/modules/pecuaria/salud/salud.endpoints.spec.ts` | 20 |
| `src/modules/pecuaria/vacuna.controller.spec.ts` | 19 |
| `src/modules/pecuaria/vacuna.desparasitacion.service.spec.ts` | 13 |

**reportes** (82 tests)

| Archivo | Tests |
|---|---:|
| `src/modules/reportes/exportacion/exportacion-reportes.controller.spec.ts` | 49 |
| `src/modules/reportes/inventario/reporte-inventario.controller.spec.ts` | 11 |
| `src/modules/reportes/produccion-agricola/reporte-produccion-agricola.endpoints.spec.ts` | 10 |
| `src/modules/reportes/produccion-pecuaria/reporte-produccion-pecuaria.endpoints.spec.ts` | 12 |

**usuarios** (82 tests)

| Archivo | Tests |
|---|---:|
| `src/modules/usuarios/usuarios.controller.spec.ts` | 49 |
| `src/modules/usuarios/usuarios.service.spec.ts` | 33 |

## 7. Cómo reproducir

```bash
cd gestionctp27-backend
pnpm test            # 95 suites, 1471 pruebas
pnpm test:cov        # cobertura (coverage/lcov-report/index.html)
pnpm test:e2e        # arranque de la app
```
