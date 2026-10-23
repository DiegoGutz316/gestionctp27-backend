# Pruebas del backend

Guía de las pruebas automatizadas de `gestionctp27-backend`: qué se prueba, cómo
está organizado y cómo ejecutarlo. Los resultados y hallazgos están en el
[reporte](./REPORTE-PRUEBAS-UNITARIAS.md); la correspondencia endpoint → prueba,
en la [matriz de endpoints](./MATRIZ-ENDPOINTS.md).

## Cómo ejecutar

```bash
pnpm test                  # toda la suite (unitarias + endpoints), ~6 s
pnpm test:cov              # con cobertura (informe en coverage/)
pnpm test:e2e              # prueba e2e de arranque (test/app.e2e-spec.ts)
npx jest src/modules/usuarios            # un módulo
npx jest -t "403"                        # casos por nombre
```

No requieren base de datos, red, Docker ni variables de entorno: toda la
persistencia se simula.

## Qué niveles de prueba hay

| Nivel | Qué ejercita | Qué se simula | Archivos |
|---|---|---|---|
| **Endpoint (HTTP)** | Ruta real: verbo, path, pipes (`ParseIntPipe`, `ParseUUIDPipe`), `ValidationPipe` estricto (igual al de `AppModule`), DTO, `RolesGuard` y `PermisosGuard` reales con la matriz de permisos vigente, cookies, descargas | Solo el service del controller | `*.controller.spec.ts`, `*.endpoints.spec.ts` |
| **Servicio (unitaria)** | Reglas de negocio, validaciones, transacciones, auditoría, errores 400/403/404/409, mapeo de respuestas | Repositorios / `DataSource` / `EntityManager` de TypeORM | `*.service.spec.ts`, `*.service.endpoints.spec.ts` |
| **Autenticación real** | `JwtStrategy` + `JwtAuthGuard` + passport-jwt con tokens firmados de verdad (cookie, Bearer, expirado, falsificado, `alg: none`, usuario desactivado) | Solo `UsuariosService` | `strategies/jwt.strategy.spec.ts` |
| **DTO / validadores / mappers / políticas** | Reglas puras de entrada y salida | Nada | specs ya existentes + `guards.spec.ts`, `cookie-auth.spec.ts` |

### Qué verifica cada endpoint (batería estándar)

Para **cada** endpoint se genera, desde una descripción declarativa, la misma
batería de casos (`test/helpers/tabla-endpoints.ts`):

1. **Camino feliz por rol:** para cada rol que la matriz autoriza, responde el
   código esperado (200/201/204), delega al método correcto del service con los
   argumentos correctos (ids convertidos a número, DTO transformado y limpio,
   usuario autenticado, `Idempotency-Key` normalizada) y reenvía su respuesta.
2. **401** sin sesión (salvo los endpoints `@Publico()`), sin llamar al service.
3. **403** para cada rol sin el nivel requerido (`LECTURA` o `COMPLETO` sobre el
   módulo), sin llamar al service.
4. **400** por cada entrada inválida declarada (campos faltantes, fuera de
   rango, enums inexistentes, fechas futuras/inexistentes, decimales de más,
   propiedades no permitidas, ids no numéricos, cabecera idempotente ausente o
   mal formada…), sin llamar al service.

Cada spec añade casos propios cuando el endpoint tiene comportamiento especial
(subida multipart de flyers, descargas PDF/Excel, cookies de sesión, etc.).

## Estructura de archivos

```
test/
  helpers/
    endpoint-app.ts       App Nest mínima con los pipes/guards globales reales,
                          matriz de permisos y utilidades (llamar, rolesCon, rolesSin)
    tabla-endpoints.ts    Generador de la batería estándar por endpoint
    typeorm-mocks.ts      Repositorio y QueryBuilder simulados (encadenables)
src/**/*.controller.spec.ts        Endpoints de un controller
src/**/*.service.spec.ts           Reglas de negocio de un service
src/**/*.service.endpoints.spec.ts Reglas de negocio de los endpoints cuando ya
                                   existía un *.service.spec.ts (se complementa, no se reemplaza)
```

Los helpers viven en `test/` (excluido de `nest build`), por lo que no llegan a
`dist/`.

## Cómo agregar pruebas para un endpoint nuevo

1. Agregar el caso a la tabla del controller (o crear `x.controller.spec.ts`):

   ```ts
   probarEndpoints({
     titulo: 'MiController',
     controller: MiController,
     servicioToken: MiService,
     metodosServicio: ['crear'],
     casos: [{
       metodo: 'post',
       ruta: '/mi-modulo',
       modulo: ModuloSistema.AGRICOLA,
       nivel: NivelPermiso.COMPLETO,
       servicio: 'crear',
       cuerpo: { nombre: 'X' },
       argumentos: (usuario) => [expect.objectContaining({ nombre: 'X' }), usuario],
       invalidos: [['nombre vacío', { cuerpo: { nombre: '' } }]],
     }],
   });
   ```

2. Si el service tiene reglas de negocio, escribir su spec con
   `crearRepositorioSimulado()` / `crearQueryBuilderSimulado()`.
3. Si cambia la matriz de permisos (migración), actualizar `MATRIZ_PERMISOS` en
   `test/helpers/endpoint-app.ts` (hoy replica la migración inicial +
   `1794000000000-LibroCaja` + `1814000000000-DocentesPublicanAvisos`).

## Convenciones

- Cada spec empieza con un comentario que lista los endpoints que cubre, el
  permiso exigido y las dependencias simuladas.
- Los nombres de los casos describen el comportamiento y el código HTTP
  (`403: DIRECTORA no tiene COMPLETO en AGRICOLA`).
- Los hallazgos del reporte se marcan en el código como `H-0x` para que, si se
  corrige el defecto, el test se actualice adrede.
- Los specs nuevos pasan `eslint` sin errores. Donde un matcher de Jest
  (`expect.objectContaining`) o `res.body` de supertest devuelve `any`, el
  archivo declara un `eslint-disable` local de las reglas `no-unsafe-*`, con su
  justificación; no se modificó `eslint.config.mjs`.

## Límites conocidos

- Las consultas SQL en bruto, restricciones `UNIQUE`/`FOREIGN KEY`, índices
  parciales y las migraciones **no se ejecutan** (la BD es simulada). Eso exige
  pruebas de integración contra PostgreSQL (ver recomendaciones del reporte).
- Los módulos de infraestructura (`main.ts`, `database/*`, migraciones, seed)
  no tienen pruebas unitarias.
