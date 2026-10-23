# Módulo Inventario

**Ruta:** `src/modules/inventario`  
**Permiso:** `INVENTARIO`  
**Propósito:** Catálogo de productos, configuración de stock, existencias y movimientos inmutables.

Submódulos: **producto**, **stock**. No exporta `StockService` a otros módulos de dominio.

## Política de acceso

- **Admin:** CRUD de productos y configuración; movimientos de cualquier departamento.
- **DOCENTE_AGRICOLA:** solo departamento `AGRICOLA` (lectura/movimientos).
- **DOCENTE_PECUARIO:** solo `PECUARIO`.

---

## 1. Productos — `/inventario/productos`

### Entidad `productos`

| Campo | Valores / notas |
|-------|-----------------|
| `nombre` | Único entre activos |
| `tipoProducto` | `INSUMO`, `HERRAMIENTA`, `EQUIPO` |
| `unidadMedida` | `Kilogramo`, `Litro`, `UNIDAD`, `Mililitro` |
| `departamento` | `AGRICOLA`, `PECUARIO`, `GENERAL` |
| `ubicacion` | `BODEGA_CENTRAL`, `BODEGA_AGRICOLA`, `BODEGA_PECUARIA`, `TALLER` |
| `activo` | Soft flag |

Crear producto **no** crea stock; eso ocurre en configuración-stock.

| Método | Ruta | Notas |
|--------|------|--------|
| `GET` | `/inventario/productos` | Paginado + filtros; docentes acotados |
| `POST` | `/inventario/productos` | Admin |
| `GET` | `/inventario/productos/:id` | Activo |
| `PATCH` | `/inventario/productos/:id` | Admin; no cambiar unidad si hay movimientos |

Auditoría: `CREAR` / `EDITAR` recurso `PRODUCTO`.

---

## 2. Stock — `/inventario/...`

### Entidades

**`ConfiguracionStock`** — 1:1 producto: `stockMinimo`, `precio`, `activo`.

**`Inventario`** — 1:1 producto: `cantidadActual` (columna `cantidad`). La API **nunca** setea la cantidad; lo hace un trigger.

**`MovimientoStock`** — inmutable: `tipo` (`APERTURA` \| `AJUSTE` \| `ENTRADA` \| `SALIDA`), `cantidad` (&gt; 0), `fecha`, `origen`/`motivo`, snapshots de producto/precio, `responsableId`.

**`IdempotenciaMovimiento`** — unique `(responsableId, clave)` + fingerprint SHA-256.

**`AuditoriaInventario`** — acciones sobre producto/configuración.

### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/inventario/configuracion-stock` | Crea config + inventario en 0 (admin) |
| `GET` | `/inventario/configuracion-stock/:id` | Detalle |
| `PATCH` | `/inventario/configuracion-stock/:id` | `stockMinimo` / `precio` / `activo` |
| `GET` | `/inventario/existencias` | Listado paginado |
| `GET` | `/inventario/existencias/movimientos` | Historial |
| `GET` | `/inventario/existencias/:id` | Una existencia |
| `POST` | `/inventario/existencias/:id/entradas` | Header `Idempotency-Key` |
| `POST` | `/inventario/existencias/:id/salidas` | Header `Idempotency-Key` |

La API solo escribe tipos `ENTRADA` / `SALIDA` (aunque el enum tenga `APERTURA`/`AJUSTE`).

### Flujo de un movimiento

1. Cliente envía body + `Idempotency-Key` (UUID).
2. Transacción: fila de idempotencia → si misma huella, replay; si huella distinta → 409.
3. Lock inventario + producto + configuración (todos activos).
4. Validar cantidad (`UNIDAD` ⇒ entero; salida sin stock negativo; tope numérico).
5. Insertar `MovimientoStock` con snapshots y precio vigente.
6. Trigger `trg_aplicar_movimiento_stock` (BEFORE INSERT): entrada suma, salida resta.
7. Si la cantidad **cruza** el mínimo hacia abajo → email a administradores (Brevo).

**Corrección:** registrar el movimiento contrario (no hay update/delete).

### DTOs principales

- Entrada: `cantidad`, `fecha`, `origen`
- Salida: `cantidad`, `fecha`, `motivo`
- Config: `productoId`, `stockMinimo`, `precio`

## Contrato API (resumen)

- Productos pueden incluir `configuracionStock` e `inventario` por separado; no existe campo `stock` unificado.
- Página fuera de rango → `datos: []` conservando `meta.pagina`.
