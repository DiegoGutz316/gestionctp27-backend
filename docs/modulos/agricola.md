# Módulo Agrícola

**Ruta:** `src/modules/agricola`  
**Permiso:** `AGRICOLA` (COMPLETO escribir / LECTURA leer)  
**Propósito:** Catálogo de cultivos, camas, ciclos de siembra, cuidados y cosechas.

**No escribe inventario:** cantidades de tratamientos y cosechas son documentales.

## Ciclo de vida

```
Cultivo + Cama DISPONIBLE
  → POST /agricola/siembras          (cama → SEMBRADA)
  → POST /agricola/tratamientos      (solo siembra abierta)
  → POST /agricola/cosechas          (± cerrarCiclo)
  → PATCH .../siembras/:id/finalizar (sin cosecha / pérdida)
  → cama → DISPONIBLE
```

Guardia BD: índice único parcial — una siembra activa (`finalizadaEn IS NULL`) por cama.

---

## 1. Cultivo — `/agricola/cultivos`

Catálogo canónico (nombre normalizado único: NFD, sin acentos, minúsculas).

### Entidad `cultivos`

`nombre`, `nombreNormalizado` (unique), `tipo`, `descripcion?`, `activo`, auditoría.

**`TipoCultivo`:** `HORTALIZA`, `VERDURA`, `GRANO_BASICO`, `RAIZ_TUBERCULO`, `FRUTA`, `HIERBA_AROMATICA`, `OTRO`

| Método | Ruta | Notas |
|--------|------|--------|
| `POST` | `/agricola/cultivos` | Alta |
| `GET` | `/agricola/cultivos` | Filtros `soloActivos`, `tipo`, `q` |
| `GET` | `/agricola/cultivos/:id` | Detalle |
| `PATCH` | `/agricola/cultivos/:id` | Edición parcial |
| `DELETE` | `/agricola/cultivos/:id` | Solo si 0 siembras; si no → 409 |

---

## 2. Cama — `/agricola/camas`

### Entidad `camas_cultivo`

`codigo` (unique), `ubicacion`, `estado`, `observaciones`, auditoría.  
`cultivoActual` es **derivado** (siembra abierta), no columna persistida.

**`EstadoCamaCultivo`:** `DISPONIBLE`, `EN_PREPARACION`, `SEMBRADA`, `EN_DESCANSO`, `MANTENIMIENTO`

| Método | Ruta | Notas |
|--------|------|--------|
| `POST` | `/agricola/camas` | Siempre inicia `DISPONIBLE` |
| `GET` | `/agricola/camas` | `q`, `ubicacion`, `camaId` |
| `GET` | `/agricola/camas/:id` | Con `cultivoActual` |
| `PATCH` | `/agricola/camas/:id` | Código/ubicación/estado/obs |
| `DELETE` | `/agricola/camas/:id` | Solo sin historial de siembras |

---

## 3. Siembra — `/agricola/siembras`

### Entidad `siembras`

| Campo | Notas |
|-------|--------|
| `cama`, `cultivo` | FK RESTRICT |
| `tipoCultivo` | Snapshot del nombre al sembrar |
| `fechaSiembra` | date |
| `finalizadaEn` | null = activa |
| `motivoFinalizacion` / `motivoDetalle` | Al cerrar sin cosecha |
| `cantidadSembrada` | numeric(12,2) &gt; 0 |
| `unidadSembrada` | `UNIDADES` \| `G` \| `KG` |

**`MotivoFinalizacionSiembra`:** `PERDIDA`, `PLAGA`, `CLIMA`, `ELIMINACION`, `OTRO` (OTRO exige detalle).

| Método | Ruta | Reglas clave |
|--------|------|--------------|
| `POST` | `/agricola/siembras` | Cama debe estar `DISPONIBLE`; sin otra activa |
| `PATCH` | `/agricola/siembras/:id/finalizar` | Motivo; libera cama |
| `GET` | `/agricola/siembras` | Filtro cultivo/fecha |
| `GET` | `/agricola/siembras/:id` | Ciclo completo + totales |

`cerrarCiclo()` también lo invoca cosecha cuando `cerrarCiclo: true` (sin motivo).

---

## 4. Tratamiento (cuidados) — `/agricola/tratamientos`

### Entidad `tratamientos_agricolas`

`siembra`, `actividad`, `tipo?`, `producto?`, `fecha`, `cantidad?`, `unidad?`, `observaciones`

**`ActividadAgricola`:** `RIEGO`, `LIMPIEZA`, `FERTILIZACION`, `TRATAMIENTO`  
Productos solo en fertilización/tratamiento (`TipoTratamiento`, `UnidadTratamiento`).

| Método | Ruta | Reglas |
|--------|------|--------|
| `POST` | `/agricola/tratamientos` | Siembra activa; fecha ≥ fechaSiembra |
| `GET` | `/agricola/tratamientos` | Solo siembras activas |

---

## 5. Cosecha — `/agricola/cosechas`

Inmutable (sin update/delete).

### Entidad `cosechas`

`siembra`, `fecha`, `cantidadObtenida`, `unidadMedida` (`KG` \| `UNIDADES`), `observaciones`

| Método | Ruta | Reglas |
|--------|------|--------|
| `POST` | `/agricola/cosechas` | Siembra activa; `UNIDADES` ⇒ entero; `cerrarCiclo?` |
| `GET` | `/agricola/cosechas` | Paginado + `totales` por unidad y por cultivo |

Totales **nunca** mezclan KG y UNIDADES.

## Dependencias internas

```
Cultivo ← Siembra → Cama
Tratamiento → Siembra
Cosecha → Siembra (+ cerrarCiclo)
```

Sin acoplamiento con pecuaria ni inventario.
