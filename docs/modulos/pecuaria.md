# Módulo Pecuaria

**Ruta:** `src/modules/pecuaria`  
**Permiso:** `PECUARIA`  
**Propósito:** Registro de animales, sanidad y producción pecuaria.

**No escribe inventario:** dosis/productos sanitarios y rendimientos son documentales.

## Modelo

```
Animal (ACTIVO)
  ├─ Vacunas
  ├─ Desparasitaciones
  ├─ Salud
  └─ Producción
Animal.desactivar → INACTIVO (bloquea altas nuevas; historial legible)
```

Helper compartido: `animal-estado.ts` (detección de inactivo).

---

## 1. Animal — `/pecuaria/animales`

### Entidad `animales`

`codigo` (unique), `nombre`, `especie`, `categoriaBovina?`, `raza`, `fechaNacimiento`, `estado`, `observaciones`, auditoría.

| Enum | Valores |
|------|---------|
| `EspecieAnimal` | `VACA`, `CHANCHO`, `GALLINA`, `POLLO`, `CABRA` |
| `EstadoAnimal` | `ACTIVO`, `INACTIVO` |
| `CategoriaBovina` | `TORO`, `NOVILLA`, `VACA`, `TERNERO`, `TORETE` (obligatoria solo si especie = VACA) |

| Método | Ruta | Notas |
|--------|------|--------|
| `POST` | `/pecuaria/animales` | Alta |
| `GET` | `/pecuaria/animales` | Activos por defecto; `incluirInactivos`, `q`, `orden` |
| `GET` | `/pecuaria/animales/:id` | Detalle |
| `PATCH` | `/pecuaria/animales/:id` | Edición |
| `PATCH` | `/pecuaria/animales/:id/desactivar` | Soft deactivate |

Código duplicado → 409. No-VACA fuerza `categoriaBovina = null`.

---

## 2. Vacunas — `/pecuaria/vacunas`

### Entidad `vacunas`

`animalId`, `tipoVacuna`, `fecha`, `dosis` (texto libre, p. ej. `"5 ml"`), `observaciones`, auditoría.

| Método | Ruta | Reglas |
|--------|------|--------|
| `POST` | `/pecuaria/vacunas` | Animal activo; lock `FOR UPDATE` |
| `GET` | `/pecuaria/vacunas/animal/:animalId` | Historial (incluye inactivo) |

---

## 3. Desparasitaciones

### Entidad `desparasitaciones`

`animalId`, `producto`, `fecha`, `observaciones`, auditoría.

| Método | Ruta |
|--------|------|
| `POST` | `/pecuaria/desparasitaciones` |
| `GET` | `/pecuaria/animales/:animalId/desparasitaciones` |

Misma política de animal activo + lock pesimista que vacunas.

---

## 4. Salud — `/pecuaria/salud`

### Entidad `registros_salud_animales`

`animal`, `fecha`, `condicionObservada`, `diagnostico?`, `observaciones?`

**`CondicionSalud`:** `SANO`, `ENFERMO`, `HERIDO`, `EN_TRATAMIENTO`, `RECUPERACION`

| Método | Ruta | Reglas |
|--------|------|--------|
| `POST` | `/pecuaria/salud` | Solo animal activo |
| `GET` | `/pecuaria/salud?animalId=` | Historial completo |

---

## 5. Producción — `/pecuaria/produccion`

### Entidad `produccion_pecuaria`

`animal`, `tipoProduccion`, `cantidad` numeric(12,2), `fecha`, auditoría.

**`TipoProduccion`:** `LECHE` (L), `HUEVOS` (unid.), `CARNE` (kg) — unidades de presentación, no columnas.

| Método | Ruta | Reglas |
|--------|------|--------|
| `POST` | `/pecuaria/produccion` | Animal activo; cantidad &gt; 0 |
| `GET` | `/pecuaria/produccion` | `animalId`, `desde?`, `tipoProduccion?` + `totales` |

No valida especie ↔ tipo de producto (cualquier animal activo puede registrar cualquier tipo).

## Dependencias

Todas las subentidades apuntan a `Animal`. Sin acoplamiento con agrícola ni inventario.
