# Módulo Libro de caja

**Ruta:** `src/modules/libro-caja`  
**Permiso:** `LIBRO_CAJA`  
**Propósito:** Caja escolar por unidades productivas — independiente de inventario.

Submódulos: **colegio**, **departamento**, **periodo** (+ fondos y asientos).

## Política

- Admin: estructura (colegio, departamentos, abrir/editar/cerrar periodos).
- Docentes/admin: fondos y asientos.
- Directora: puede guardar pie de informe (además de lectura).

---

## 1. Colegio — `/libro-caja/colegio`

### Entidad `informacion_colegio` (singleton `id=1`)

`nombre`, `numeroCuentaBancaria`, `entidadDeposito`, timestamps, `actualizadoPor`.

| Método | Ruta | Notas |
|--------|------|--------|
| `GET` | `/libro-caja/colegio` | Auto-crea default “CTP 27 de abril” si falta |
| `PUT` | `/libro-caja/colegio` | Admin |

---

## 2. Departamentos — `/libro-caja/departamentos`

### Entidad `departamentos_caja`

`nombreUnidad`, `tipoActividad`, `activo`, auditoría. Nombre único entre activos.

| Método | Ruta | Notas |
|--------|------|--------|
| `GET` | `/libro-caja/departamentos` | Filtros `activo`, `tipoActividad`, `q` |
| `POST` | `/libro-caja/departamentos` | Admin; si hay periodo abierto → fondo `PENDIENTE` |
| `GET` | `/libro-caja/departamentos/:id` | Detalle |
| `PATCH` | `/libro-caja/departamentos/:id` | Editar |
| `PATCH` | `/libro-caja/departamentos/:id/desactivar` | Soft delete |

---

## 3. Periodos, fondos y asientos — `/libro-caja/periodos`

### Entidades

**`PeriodoCaja`:** `nombre`, `fechaInicio`, `fechaFin`, `estado` (`ABIERTO` \| `CERRADO`), fondos[].

**`FondoCaja`:** por (periodo, departamento); `montoSolicitado`, `estado` (`PENDIENTE` \| `SOLICITADO`), `pieInforme` jsonb (observaciones, firmas, roles).

**`AsientoCaja`:** `numero`, `fecha`, `numeroFactura`, `descripcion`, `ingresos`, `egresos` — el saldo **no** se persiste.

**`IdempotenciaAsiento`:** misma idea que inventario para altas.

### Periodos

| Método | Ruta | Reglas |
|--------|------|--------|
| `GET` | `/libro-caja/periodos` | Filtro estado / `q` |
| `POST` | `/libro-caja/periodos` | Un solo ABIERTO; sin solapes; fondos para **todos** los deptos activos (puede ser ₡0) → estado `SOLICITADO` |
| `GET` | `/libro-caja/periodos/:id` | Periodo + fondos |
| `PATCH` | `/libro-caja/periodos/:id` | Solo ABIERTO; rango debe cubrir asientos existentes |
| `POST` | `/libro-caja/periodos/:id/cerrar` | → CERRADO |
| `POST` | `.../fondos/:fondoId/solicitar` | Solo si `PENDIENTE` (depto incorporado tarde) |
| `PATCH` | `.../fondos/:fondoId/informe` | Pie de informe |

### Asientos — `.../periodos/:periodoId/fondos/:fondoId/asientos`

| Método | Ruta | Reglas |
|--------|------|--------|
| `GET` | `.../asientos` | Libro con saldo corrido + totales |
| `POST` | `.../asientos` | `Idempotency-Key`; ingreso **XOR** egreso |
| `PATCH` | `.../asientos/:asientoId` | Corrección (periodo abierto) |
| `DELETE` | `.../asientos/:asientoId` | Anula; limpia vínculo de idempotencia |

### Reglas de asientos

1. Periodo `ABIERTO` y fondo `SOLICITADO`.
2. Fecha del asiento ∈ `[fechaInicio, fechaFin]`.
3. Exactamente uno de `ingresos` / `egresos` &gt; 0; el otro = 0.
4. Tras create/update/delete: reordenar por fecha/id, renumerar 1…n.
5. Saldo corrido: `montoSolicitado + Σ(ingresos − egresos)` **nunca &lt; 0** (colones, 2 decimales).
6. Tras DELETE, la misma clave de idempotencia → 409 (usar nueva clave).

## Independencia

Comentarios y diseño del módulo dejan claro que **libro-caja no depende de inventario**.
