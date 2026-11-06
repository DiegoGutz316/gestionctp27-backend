# Fichas de evaluación — USAB-01 a USAB-10

Campos de resultado **en blanco** a propósito. Completar solo durante la sesión real.

---

## USAB-01 — Registrar un ingreso de ₡85.000

| Campo | Contenido |
|-------|-----------|
| ID | USAB-01 |
| Módulo | Libro de Caja |
| Nombre | Registrar ingreso por venta |
| Objetivo | Comprobar si el participante registra un ingreso y comprende el saldo |
| Perfil | Docente pecuario (`DOCENTE_PECUARIO`) |
| Datos iniciales | Periodo **USAB REAL — Evaluación**; Unidad Pecuaria con fondo ₡200.000 y egreso previo ₡5.000 (saldo ₡195.000) |

**Escenario / instrucción al usuario**

> Hoy ingresaron ochenta y cinco mil colones por la venta de carne de la unidad pecuaria. Registre ese movimiento y dígame cuánto dinero queda disponible.

**Resultado esperado (moderador)**

- Asiento de ingreso ₡85.000 en Unidad Pecuaria.
- Saldo mostrado coherente con ₡280.000 (195.000 + 85.000).
- No debe quedar egreso positivo en el mismo movimiento.

### Registro de ejecución

| Campo | Valor |
|-------|-------|
| Código participante | |
| Fecha | |
| Hora inicio | |
| Hora fin | |
| Tiempo total (min) | |
| Nº errores | |
| Nº solicitudes de ayuda | |
| Resultado tarea | ☐ Completada sin ayuda ☐ Con dificultad ☐ Con ayuda ☐ No completada ☐ Bloqueada por entorno |
| Dificultades observadas | |
| Comentarios del participante | |
| Evidencia | `evidencias/USAB-01/` |

---

## USAB-02 — Solicitar fondo inicial de ₡150.000

| Campo | Contenido |
|-------|-----------|
| ID | USAB-02 |
| Módulo | Libro de Caja |
| Nombre | Solicitar fondo de la unidad agrícola |
| Objetivo | Ver si encuentra cómo solicitar el fondo cuando aún está pendiente |
| Perfil | Docente agrícola |
| Datos iniciales | Mismo periodo; Unidad Agrícola en estado **PENDIENTE** |

**Instrucción**

> La unidad agrícola necesita empezar el periodo con ciento cincuenta mil colones de fondo. Trámite esa solicitud en el sistema.

**Resultado esperado**

- Fondo agrícola pasa a solicitado con monto ₡150.000.
- Queda habilitado el libro de esa unidad.

### Registro de ejecución

| Campo | Valor |
|-------|-------|
| Código participante | |
| Fecha | |
| Hora inicio | |
| Hora fin | |
| Tiempo total (min) | |
| Nº errores | |
| Nº solicitudes de ayuda | |
| Resultado tarea | ☐ Completada sin ayuda ☐ Con dificultad ☐ Con ayuda ☐ No completada ☐ Bloqueada por entorno |
| Dificultades observadas | |
| Comentarios del participante | |
| Evidencia | `evidencias/USAB-02/` |

---

## USAB-03 — Corregir un asiento mal registrado

| Campo | Contenido |
|-------|-----------|
| ID | USAB-03 |
| Módulo | Libro de Caja |
| Nombre | Corregir egreso de prueba |
| Objetivo | Evaluar corrección de un movimiento existente |
| Perfil | Docente pecuario |
| Datos iniciales | Asiento «Compra de concentrado (registro de prueba USAB-03)» egreso ₡5.000 |

**Instrucción**

> En el libro de la unidad pecuaria hay un gasto de cinco mil colones que se anotó mal: en realidad fueron tres mil. Corrija ese registro y confirme el saldo.

**Resultado esperado**

- El asiento queda con egreso ₡3.000 (u otro valor que el participante justifique tras entender el enunciado; el moderador anota lo que hizo).
- El saldo del libro se recalcula.
- Preferible corrección, no borrado silencioso sin motivo.

### Registro de ejecución

| Campo | Valor |
|-------|-------|
| Código participante | |
| Fecha | |
| Hora inicio | |
| Hora fin | |
| Tiempo total (min) | |
| Nº errores | |
| Nº solicitudes de ayuda | |
| Resultado tarea | ☐ Completada sin ayuda ☐ Con dificultad ☐ Con ayuda ☐ No completada ☐ Bloqueada por entorno |
| Dificultades observadas | |
| Comentarios del participante | |
| Evidencia | `evidencias/USAB-03/` |

---

## USAB-04 — Registrar una ternera Holstein

| Campo | Contenido |
|-------|-----------|
| ID | USAB-04 |
| Módulo | Gestión Pecuaria |
| Nombre | Alta de ternera Estrella |
| Objetivo | Comprobar categoría bovina comprensible (Ternero/a) y alta de animal |
| Perfil | Docente pecuario |
| Datos iniciales | Código `BOV-QA-01` libre |

**Instrucción**

> Nació una ternera Holstein a la que llamaremos Estrella. Debe quedar registrada en el inventario bovino con el código BOV-QA-01.

**Resultado esperado**

- Animal `BOV-QA-01` / Estrella / Holstein / categoría interna TERNERO (etiqueta Ternero/a).
- Estado activo.

### Registro de ejecución

| Campo | Valor |
|-------|-------|
| Código participante | |
| Fecha | |
| Hora inicio | |
| Hora fin | |
| Tiempo total (min) | |
| Nº errores | |
| Nº solicitudes de ayuda | |
| Resultado tarea | ☐ Completada sin ayuda ☐ Con dificultad ☐ Con ayuda ☐ No completada ☐ Bloqueada por entorno |
| Dificultades observadas | |
| Comentarios del participante | |
| Evidencia | `evidencias/USAB-04/` |

---

## USAB-05 — Registrar producción de leche

| Campo | Contenido |
|-------|-----------|
| ID | USAB-05 |
| Módulo | Gestión Pecuaria |
| Nombre | Producción de leche de Luna |
| Objetivo | Registrar producción asociada a la vaca Luna |
| Perfil | Docente pecuario |
| Datos iniciales | Animal `LUNA-USAB` (Luna) activo |

**Instrucción**

> Esta mañana Luna produjo doce litros de leche. Deje constancia de esa producción en el sistema.

**Resultado esperado**

- Registro de producción tipo leche vinculado a Luna.
- Cantidad coherente con lo indicado (12 L o unidad que ofrezca el formulario).

### Registro de ejecución

| Campo | Valor |
|-------|-------|
| Código participante | |
| Fecha | |
| Hora inicio | |
| Hora fin | |
| Tiempo total (min) | |
| Nº errores | |
| Nº solicitudes de ayuda | |
| Resultado tarea | ☐ Completada sin ayuda ☐ Con dificultad ☐ Con ayuda ☐ No completada ☐ Bloqueada por entorno |
| Dificultades observadas | |
| Comentarios del participante | |
| Evidencia | `evidencias/USAB-05/` |

---

## USAB-06 — Registrar estado de salud animal

| Campo | Contenido |
|-------|-----------|
| ID | USAB-06 |
| Módulo | Gestión Pecuaria |
| Nombre | Salud de Luna |
| Objetivo | Encontrar “Salud animal” y registrar observación |
| Perfil | Docente pecuario |
| Datos iniciales | Luna disponible; nav pecuaria con Salud animal |

**Instrucción**

> Revisaron a Luna y se ve sana, sin signos de enfermedad. Registre esa observación de salud.

**Resultado esperado**

- Registro de salud para Luna (condición sana o equivalente).
- El participante halló la sección sin guion técnico del moderador.

### Registro de ejecución

| Campo | Valor |
|-------|-------|
| Código participante | |
| Fecha | |
| Hora inicio | |
| Hora fin | |
| Tiempo total (min) | |
| Nº errores | |
| Nº solicitudes de ayuda | |
| Resultado tarea | ☐ Completada sin ayuda ☐ Con dificultad ☐ Con ayuda ☐ No completada ☐ Bloqueada por entorno |
| Dificultades observadas | |
| Comentarios del participante | |
| Evidencia | `evidencias/USAB-06/` |

---

## USAB-07 — Registrar una siembra de lechuga

| Campo | Contenido |
|-------|-----------|
| ID | USAB-07 |
| Módulo | Gestión Agrícola |
| Nombre | Siembra de lechuga |
| Objetivo | Sembrar en cama disponible del Invernadero 1 |
| Perfil | Docente agrícola |
| Datos iniciales | Cama `USAB-REAL-LIBRE` DISPONIBLE; cultivo Lechuga activo |

**Instrucción**

> Hay que sembrar lechuga en una cama libre del invernadero 1. Registre la siembra con los datos que usted considere razonables.

**Resultado esperado**

- Nueva siembra de lechuga; cama deja de estar disponible.
- No se usa la cama del tomate activo.

### Registro de ejecución

| Campo | Valor |
|-------|-------|
| Código participante | |
| Fecha | |
| Hora inicio | |
| Hora fin | |
| Tiempo total (min) | |
| Nº errores | |
| Nº solicitudes de ayuda | |
| Resultado tarea | ☐ Completada sin ayuda ☐ Con dificultad ☐ Con ayuda ☐ No completada ☐ Bloqueada por entorno |
| Dificultades observadas | |
| Comentarios del participante | |
| Evidencia | `evidencias/USAB-07/` |

---

## USAB-08 — Registrar una cosecha parcial de tomate

| Campo | Contenido |
|-------|-----------|
| ID | USAB-08 |
| Módulo | Gestión Agrícola |
| Nombre | Cosecha parcial de tomate |
| Objetivo | Cosechar sin cerrar el ciclo por accidente |
| Perfil | Docente agrícola |
| Datos iniciales | Siembra activa de Tomate en `USAB-TOMATE` |

**Instrucción**

> Ya se pueden recolectar algunos tomates, pero el cultivo sigue en la cama. Registre una cosecha parcial; el ciclo no debe darse por terminado.

**Resultado esperado**

- Cosecha registrada.
- Siembra de tomate **sigue activa** (`finalizada_en` nula).
- Cama no vuelve a DISPONIBLE.

### Registro de ejecución

| Campo | Valor |
|-------|-------|
| Código participante | |
| Fecha | |
| Hora inicio | |
| Hora fin | |
| Tiempo total (min) | |
| Nº errores | |
| Nº solicitudes de ayuda | |
| Resultado tarea | ☐ Completada sin ayuda ☐ Con dificultad ☐ Con ayuda ☐ No completada ☐ Bloqueada por entorno |
| Dificultades observadas | |
| Comentarios del participante | |
| Evidencia | `evidencias/USAB-08/` |

---

## USAB-09 — Publicar un aviso institucional

| Campo | Contenido |
|-------|-----------|
| ID | USAB-09 |
| Módulo | Reportes y Avisos |
| Nombre | Publicar aviso |
| Objetivo | Publicar aviso con fecha válida e imagen opcional |
| Perfil | Docente con `REPORTES=COMPLETO` (agrícola o pecuario). **No** Directora |
| Datos iniciales | Flyer de ejemplo en `recursos/flyer-ejemplo-usab09.png` |

**Instrucción**

> Hay que avisar a la comunidad sobre la feria agrícola del mes próximo. Publique un aviso institucional para que se vea en la página del colegio. Puede adjuntar una imagen si lo encuentra.

**Resultado esperado**

- Aviso activo con título/descripción/fecha futura.
- Visible en gestión y, si aplica, en avisos públicos.
- Si el perfil es Directora (control negativo): no debe poder publicar (403 / sin botón).

### Registro de ejecución

| Campo | Valor |
|-------|-------|
| Código participante | |
| Fecha | |
| Hora inicio | |
| Hora fin | |
| Tiempo total (min) | |
| Nº errores | |
| Nº solicitudes de ayuda | |
| Resultado tarea | ☐ Completada sin ayuda ☐ Con dificultad ☐ Con ayuda ☐ No completada ☐ Bloqueada por entorno |
| Dificultades observadas | |
| Comentarios del participante | |
| Evidencia | `evidencias/USAB-09/` |

---

## USAB-10 — Consultar y exportar un informe económico

| Campo | Contenido |
|-------|-----------|
| ID | USAB-10 |
| Módulo | Reportes y Avisos / Libro de Caja |
| Nombre | Informe económico Excel |
| Objetivo | Localizar el informe de la unidad pecuaria y exportarlo |
| Perfil | Directora (lectura) u otro rol con acceso al libro |
| Datos iniciales | Periodo USAB REAL; Unidad Pecuaria con movimientos |

**Instrucción**

> Necesita revisar cómo van las cuentas de la unidad pecuaria en este periodo y llevarse una copia en Excel para la junta. Consúltelo y exporte el archivo.

**Resultado esperado**

- Abre el informe económico de la unidad pecuaria.
- Descarga un `.xlsx` coherente con los movimientos visibles.
- Directora no requiere permiso COMPLETO de Reportes para esta consulta de caja.

### Registro de ejecución

| Campo | Valor |
|-------|-------|
| Código participante | |
| Fecha | |
| Hora inicio | |
| Hora fin | |
| Tiempo total (min) | |
| Nº errores | |
| Nº solicitudes de ayuda | |
| Resultado tarea | ☐ Completada sin ayuda ☐ Con dificultad ☐ Con ayuda ☐ No completada ☐ Bloqueada por entorno |
| Dificultades observadas | |
| Comentarios del participante | |
| Evidencia | `evidencias/USAB-10/` |
