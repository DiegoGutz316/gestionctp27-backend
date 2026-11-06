# Fichas para sesiones con usuarios reales

Las secciones de **resultados** van vacías a propósito. Completarlas solo durante o después de cada sesión presencial.

**Guion breve al inicio:**  
«Vamos a usar el sistema como en un día de trabajo. No hay respuestas de memoria. Puede pensar en voz alta. Si se atora, inténtelo como lo haría solo; si pide ayuda, se la damos y la anotamos. No es una prueba de usted.»

---

## USAB-01 — Registrar un ingreso

| | |
|---|---|
| **Módulo** | Libro de Caja |
| **Instrucción exacta** | «Anote en el libro de caja de la unidad pecuaria que hoy entraron ochenta y cinco mil colones por venta de carne. Cuando termine, dígame cuánto queda de saldo.» |
| **Datos** | ₡85.000 · ingreso · «Venta de carne» · unidad pecuaria · periodo abierto con fondo solicitado |
| **Condiciones iniciales** | Usuario docente pecuario; periodo abierto; fondo pecuario `SOLICITADO` |
| **Criterios de éxito** | Asiento con ingreso 85000 y egreso 0; participante enuncia un saldo coherente con el libro |
| **Errores a observar** | Llena ambos montos; pone el monto en egresos; usa coma `85,000`; no encuentra la unidad; no identifica el saldo |
| **Prioridad** | Alta |

### Resultados (vacío hasta sesión real)

| Campo | Anotar |
|---|---|
| Participante / perfil | |
| Fecha / hora | |
| Tiempo (mm:ss) | |
| Intentos | |
| Errores (# y descripción) | |
| Ayuda (0 / 1 / 2) | |
| Completada (Sí / Parcial / No) | |
| Observaciones / citas | |

---

## USAB-02 — Solicitar fondo inicial

| | |
|---|---|
| **Módulo** | Libro de Caja |
| **Instrucción exacta** | «El periodo de este semestre ya existe. Deje el fondo inicial de la unidad agrícola en ciento cincuenta mil colones y entre al libro de esa unidad para comprobar que ya se pueden anotar movimientos.» |
| **Datos** | ₡150.000 · unidad agrícola · periodo abierto · fondo en `PENDIENTE` |
| **Condiciones iniciales** | Docente agrícola o admin; fondo agrícola pendiente |
| **Criterios de éxito** | Fondo solicitado en 150000; accede al libro de esa unidad |
| **Errores a observar** | Abre otro periodo; edita colegio; no entiende «Solicitar fondo»; busca un trámite externo |
| **Prioridad** | Alta |

### Resultados (vacío)

| Campo | Anotar |
|---|---|
| Participante / perfil | |
| Tiempo | |
| Intentos | |
| Errores | |
| Ayuda (0/1/2) | |
| Completada | |
| Observaciones | |

---

## USAB-03 — Corregir un asiento

| | |
|---|---|
| **Módulo** | Libro de Caja |
| **Instrucción exacta** | «En el libro hay un movimiento mal anotado: dice egreso de cinco mil colones y debió ser un ingreso. Déjelo como corresponde y confirme el saldo.» |
| **Datos** | Asiento egreso ₡5.000 preexistente (preparado por el evaluador) |
| **Condiciones iniciales** | Libro pecuario con el asiento incorrecto visible |
| **Criterios de éxito** | Queda como ingreso 5000 (edición, o anulación + nuevo asiento bien hecho); saldo coherente |
| **Errores a observar** | Anula sin reponer; busca un «motivo» que no existe; no distingue Editar de Anular; no nota que la fila desapareció |
| **Prioridad** | Alta |

### Resultados (vacío)

| Campo | Anotar |
|---|---|
| Participante / perfil | |
| Tiempo | |
| Intentos | |
| Errores | |
| Ayuda (0/1/2) | |
| Completada | |
| Observaciones | |

---

## USAB-04 — Registrar un bovino

| | |
|---|---|
| **Módulo** | Gestión Pecuaria |
| **Instrucción exacta** | «Registre una ternera recién nacida de raza Holstein, código BOV-QA-01, nombre Estrella, para el inventario de bovinos.» |
| **Datos** | Código BOV-QA-01 · Estrella · Holstein · categoría ternera/ternero · bovinos |
| **Condiciones iniciales** | Docente pecuario; código libre |
| **Criterios de éxito** | Animal en inventario bovino; categoría de cría (Ternero/a); no en especies menores |
| **Errores a observar** | Va a especies menores; elige categoría «Vaca» adulta; no encuentra la opción «Ternero/a» al buscar «ternera» |
| **Prioridad** | Alta |

### Resultados (vacío)

| Campo | Anotar |
|---|---|
| Participante / perfil | |
| Tiempo | |
| Intentos | |
| Errores | |
| Ayuda (0/1/2) | |
| Completada | |
| Observaciones | |

---

## USAB-05 — Registrar producción de leche

| | |
|---|---|
| **Módulo** | Gestión Pecuaria |
| **Instrucción exacta** | «Anote que hoy la vaca Luna dio doce coma cinco litros de leche.» |
| **Datos** | Animal Luna · 12,5 · leche · fecha de hoy |
| **Condiciones iniciales** | Luna activa (especie vaca) |
| **Criterios de éxito** | Registro tipo leche cantidad 12.5 asociado a Luna |
| **Errores a observar** | Elige Carne; no encuentra Producción; duda por la unidad; usa formato numérico incorrecto |
| **Prioridad** | Alta |

### Resultados (vacío)

| Campo | Anotar |
|---|---|
| Participante / perfil | |
| Tiempo | |
| Intentos | |
| Errores | |
| Ayuda (0/1/2) | |
| Completada | |
| Observaciones | |

---

## USAB-06 — Registrar estado de salud

| | |
|---|---|
| **Módulo** | Gestión Pecuaria |
| **Instrucción exacta** | «Deje constancia de que hoy Luna se observó enferma, con sospecha de mastitis, y que quedó en seguimiento.» |
| **Datos** | Luna · Enfermo · diagnóstico mastitis · seguimiento |
| **Condiciones iniciales** | Docente pecuario |
| **Criterios de éxito** | Registro de salud ENFERMO (o EN_TRATAMIENTO si lo justifica) en la ficha |
| **Errores a observar** | Va a Vacunas o Desparasitación; marca Sano; no encuentra Salud |
| **Prioridad** | Media |

### Resultados (vacío)

| Campo | Anotar |
|---|---|
| Participante / perfil | |
| Tiempo | |
| Intentos | |
| Errores | |
| Ayuda (0/1/2) | |
| Completada | |
| Observaciones | |

---

## USAB-07 — Registrar una siembra

| | |
|---|---|
| **Módulo** | Gestión Agrícola |
| **Instrucción exacta** | «Siembre cincuenta plantas de lechuga en una cama libre del invernadero 1, con fecha de hoy.» |
| **Datos** | 50 · Lechuga · cama DISPONIBLE · Invernadero 1 |
| **Condiciones iniciales** | Al menos una cama disponible; cultivo Lechuga activo. Si no hay cama libre, **no** crear una por el participante: observar qué hace |
| **Criterios de éxito** | Siembra activa de lechuga, cantidad 50, cama correcta |
| **Errores a observar** | Selector vacío; no sabe crear cama; va primero a Cosechas |
| **Prioridad** | Alta |

### Resultados (vacío)

| Campo | Anotar |
|---|---|
| Participante / perfil | |
| Tiempo | |
| Intentos | |
| Errores | |
| Ayuda (0/1/2) | |
| Completada | |
| Observaciones | |

---

## USAB-08 — Cosecha parcial sin cerrar ciclo

| | |
|---|---|
| **Módulo** | Gestión Agrícola |
| **Instrucción exacta** | «Anote una cosecha de doce coma cinco kilos de tomate de la siembra que sigue activa. No cierre el cultivo: la próxima semana se vuelve a cosechar.» |
| **Datos** | 12,5 kg · siembra tomate activa · no finalizar |
| **Condiciones iniciales** | Siembra de tomate con `finalizadaEn` nulo |
| **Criterios de éxito** | Cosecha 12.5 kg **y** la siembra sigue activa. Si se cerró el ciclo, la tarea **falla** aunque se hayan guardado los kilos |
| **Errores a observar** | Activa «Finalizar la siembra»; entra por Finalizar ciclo; no verifica que la siembra siga abierta |
| **Prioridad** | Alta |

### Resultados (vacío)

| Campo | Anotar |
|---|---|
| Participante / perfil | |
| Tiempo | |
| Intentos | |
| Errores | |
| Ayuda (0/1/2) | |
| Completada | |
| Observaciones | |
| ¿Ciclo cerrado por error? (Sí/No) | |

---

## USAB-09 — Publicar aviso institucional

| | |
|---|---|
| **Módulo** | Reportes y Avisos |
| **Instrucción exacta** | «Publique en la página del colegio que habrá un bingo en el comedor el día 30 de este mes, para la comunidad, con una imagen de la convocatoria. Confirme que se verá en la página pública.» |
| **Datos** | Título bingo · fecha día 30 · categoría eventos · estado activo · imagen de prueba |
| **Condiciones iniciales** | Usuario con REPORTES completo (admin o docente autorizado). Si es Directora, **no forzar**: registrar el bloqueo |
| **Criterios de éxito** | Aviso ACTIVO con fecha válida e imagen; visible en públicos **o** el participante detecta y explica el fallo del flyer/permiso |
| **Errores a observar** | Busca «Reportes»; deja Inactivo; fecha pasada; no adjunta imagen; no encuentra Avisos bajo Análisis |
| **Prioridad** | Alta |

### Resultados (vacío)

| Campo | Anotar |
|---|---|
| Participante / perfil | |
| Tiempo | |
| Intentos | |
| Errores | |
| Ayuda (0/1/2) | |
| Completada | |
| Observaciones | |
| ¿Bloqueo por permisos? | |

---

## USAB-10 — Consultar y exportar informe económico

| | |
|---|---|
| **Módulo** | Reportes y Avisos |
| **Instrucción exacta** | «Necesita el informe económico de la unidad pecuaria de este periodo, para llevarlo a una reunión. Bájelo en Excel y dígame cuál es el saldo que aparece.» |
| **Datos** | Periodo actual · unidad pecuaria |
| **Condiciones iniciales** | Directora (lectura); periodo y fondo con movimientos |
| **Criterios de éxito** | Abre el informe; enuncia el saldo; obtiene archivo Excel |
| **Errores a observar** | Busca menú Reportes; se queda en Avisos; imprime en vez de Excel; no encuentra Generar informe |
| **Prioridad** | Alta |

### Resultados (vacío)

| Campo | Anotar |
|---|---|
| Participante / perfil | |
| Tiempo | |
| Intentos | |
| Errores | |
| Ayuda (0/1/2) | |
| Completada | |
| Saldo dicho por el participante | |
| Observaciones | |
