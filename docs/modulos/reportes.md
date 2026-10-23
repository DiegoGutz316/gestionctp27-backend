# Módulo Reportes

**Ruta:** `src/modules/reportes`  
**Permiso:** `REPORTES` + `LECTURA`  
**Propósito:** Agregaciones de solo lectura y exportación PDF (pdfkit) / Excel (ExcelJS).

Lee entidades de pecuaria, agrícola e inventario; no muta datos.

## Endpoints JSON

| Método | Ruta | Filtros clave |
|--------|------|---------------|
| `GET` | `/reportes/produccion-pecuaria` | `animalId`, `fechaInicio`, `fechaFin` |
| `GET` | `/reportes/produccion-agricola` | `fechaInicio`, `fechaFin`; opcional `cultivo`, `camaId` |
| `GET` | `/reportes/inventario` | `fechaInicio`, `fechaFin`; opcional `productoId`, `tipoProducto` |

## Exportación

Para cada tipo:

```
GET /reportes/exportacion/{produccion-pecuaria|produccion-agricola|inventario}/{pdf|excel}
```

Mismos filtros que el JSON. Respuesta con `Content-Disposition: attachment` y nombre `reporte-…-{fechaInicio}-{fechaFin}.pdf|.xlsx`.

Pipeline: `generar()` → mapper a `DocumentoExportacion` → `ReportePdfService` (A4 landscape) o `ReporteExcelService` (hoja por sección, header congelado).

---

## 1. Producción pecuaria

1. 404 si el animal no existe.
2. Lista `ProduccionPecuaria` del animal en rango cerrado de fechas.
3. Totales por `tipoProduccion` (no se mezclan tipos), 2 decimales.
4. Periodo vacío → arrays vacíos (no 404).

---

## 2. Producción agrícola

Tres consultas independientes en el rango:

| Bloque | Fuente | Criterio |
|--------|--------|----------|
| Siembras | `Siembra` | `fechaSiembra` |
| Cosechas | `Cosecha` | `fecha`; totales `SUM` por `unidadMedida` |
| Tratamientos | `TratamientoAgricola` | `fecha` |

Filtros opcionales de cultivo (ILIKE) y `camaId`. La cosecha **no** actualiza inventario; el reporte solo lee.

---

## 3. Inventario

Agregación SQL sobre `movimientos_stock`:

| Campo | Cálculo |
|-------|---------|
| Inclusión | Productos con ≥ 1 movimiento en el periodo |
| `entradas` | SUM de `ENTRADA` en rango |
| `salidas` | SUM de `SALIDA` en rango |
| `existenciaFinal` | Suma firmada de movimientos con `fecha ≤ fechaFin` (ENTRADA +, SALIDA −) |
| `saldoActual` | `inventario.cantidad` vigente (puede diferir de `existenciaFinal`) |

Usa la entidad `MovimientoStock` directamente (sin importar `InventarioModule`).

## Dependencias

```
reportes → pecuaria (Animal, ProduccionPecuaria)
reportes → agricola (Siembra, Cosecha, TratamientoAgricola)
reportes → inventario (MovimientoStock + enums de producto)
```
