# Lógica de negocio (visión transversal)

## Roles institucionales

| Rol | Uso típico |
|-----|------------|
| `ADMINISTRADOR` | Gestión total (usuarios, catálogos, caja, inventario) |
| `DIRECTORA` | Lectura amplia; pie de informe de caja |
| `DOCENTE_PECUARIO` | Pecuaria + inventario de su depto + caja + reportes |
| `DOCENTE_AGRICOLA` | Agrícola + inventario de su depto + caja + reportes |
| `ESTUDIANTE` | Lectura limitada (panel, pecuaria, agrícola, inventario) |

## Matriz de permisos (semilla)

Niveles: `NINGUNO` &lt; `LECTURA` &lt; `COMPLETO`.

| Módulo | Admin | Directora | Doc. pecuario | Doc. agrícola | Estudiante |
|--------|-------|-----------|---------------|---------------|------------|
| PANEL | COMPLETO | LECTURA | LECTURA | LECTURA | LECTURA |
| USUARIOS | COMPLETO | NINGUNO | NINGUNO | NINGUNO | NINGUNO |
| PECUARIA | COMPLETO | LECTURA | COMPLETO | NINGUNO | LECTURA |
| AGRICOLA | COMPLETO | LECTURA | NINGUNO | COMPLETO | LECTURA |
| INVENTARIO | COMPLETO | LECTURA | COMPLETO* | COMPLETO* | LECTURA |
| LIBRO_CAJA | COMPLETO | LECTURA | COMPLETO | COMPLETO | NINGUNO |
| REPORTES | COMPLETO | LECTURA | COMPLETO | COMPLETO | NINGUNO |

\*Docentes solo operan el departamento de su rol (AGRÍCOLA / PECUARIO). Comunicación (avisos) se autoriza vía módulo `REPORTES`.

## Flujos principales

### Agrícola

```
Cultivo (catálogo) + Cama DISPONIBLE
        → Siembra activa (cama SEMBRADA)
        → Tratamientos / cuidados (solo siembra abierta)
        → Cosecha(s)  [opcional cerrarCiclo]
        → o Finalizar siembra (pérdida/plaga/…)
        → Cama DISPONIBLE
```

Una sola siembra activa por cama (índice único parcial en BD).

### Pecuaria

```
Animal ACTIVO
  ├─ Vacunas / Desparasitaciones / Salud / Producción
Animal INACTIVO → bloquea nuevos registros; historial legible
```

### Inventario

```
Producto → Configuración stock (+ Inventario en 0)
        → Entradas / Salidas (Idempotency-Key)
        → Trigger BD actualiza cantidad
        → Si cruza stock mínimo → email a admins
```

Corrección = movimiento contrario (no hay edición de movimientos).

### Libro de caja

```
Información colegio + Departamentos (unidades)
        → Abrir periodo (fondos SOLICITADO por depto activo)
        → Asientos ingreso XOR egreso (saldo ≥ 0)
        → Cerrar periodo
```

Independiente de inventario.

### Reportes

Lectura agregada de pecuaria / agrícola / movimientos de stock; mismos filtros en JSON, PDF y Excel.

## Reglas transversales

1. **Fechas:** formato `AAAA-MM-DD`; la mayoría no admite futuro (zona America/Costa_Rica).
2. **Cantidades:** `numeric(12,2)`, &gt; 0; unidades enteras cuando el dominio lo exige (`UNIDADES` en cosecha; `UNIDAD` en stock).
3. **Soft delete / desactivación:** usuarios, productos, avisos, animales, departamentos — no borrado físico cuando hay historial.
4. **Auditoría:** `creadoPor` / `actualizadoPor` desde JWT donde aplica.
5. **Idempotencia:** entradas/salidas de stock y creación de asientos requieren header `Idempotency-Key` (UUID).
6. **Aislamiento de dominios:** agrícola y pecuaria **no** escriben inventario; cosechas y dosis sanitarias son registros documentales.

## Dependencias entre módulos

```
Auth ← Usuarios
Auth (guards) → todos los controllers protegidos
Comunicacion → Auth (PermisosService)
Reportes → lee entidades de Agrícola, Pecuaria, Inventario
Inventario → Usuarios (responsable, admins para mail)
LibroCaja → independiente
Agrícola ↔ Pecuaria → sin acoplamiento
Agrícola / Pecuaria → Inventario → sin escritura cruzada
Dashboard → vacío (permiso PANEL preparado)
```
