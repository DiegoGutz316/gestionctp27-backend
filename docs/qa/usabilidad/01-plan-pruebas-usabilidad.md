# Plan de pruebas de usabilidad — GestiónCTP27

**Fecha de preparación:** 2026-11-05  
**Entorno técnico:** `gestionctp27_qa` + API `localhost:4010` + frontend `localhost:3000`  
**Alcance:** exactamente 10 pruebas (sin Inventario)

---

## 1. Objetivos

1. Comprobar si profesores y la directora pueden completar tareas cotidianas sin guía técnica.
2. Detectar confusión de navegación, formularios ambiguos, mensajes poco claros y acciones irreversibles.
3. Separar claramente:
   - **comprobación técnica** (API + navegador automatizado), ya ejecutada;
   - **sesión con usuarios reales**, pendiente y obligatoria.

Un `PASS` técnico **no** significa que la tarea sea usable para personas.

## 2. Alcance

| Módulo | Pruebas | IDs |
|---|---|---|
| Libro de Caja | 3 | USAB-01, USAB-02, USAB-03 |
| Gestión Pecuaria | 3 | USAB-04, USAB-05, USAB-06 |
| Gestión Agrícola | 2 | USAB-07, USAB-08 |
| Reportes y Avisos | 2 | USAB-09, USAB-10 |
| **Total** | **10** | |

**Excluido:** Inventario / stock / bodega.

## 3. Participantes previstos

| Código | Perfil | Rol sugerido en el sistema |
|---|---|---|
| P-A | Profesor con conocimientos tecnológicos básicos | `DOCENTE_PECUARIO` o `DOCENTE_AGRICOLA` |
| P-B | Directora del colegio | `DIRECTORA` |
| P-C | Usuario que usa el sistema por primera vez | Cualquiera de los anteriores, sin entrenamiento previo |

Credenciales de laboratorio QA (solo entorno aislado):

| Correo | Rol |
|---|---|
| `pecuario@qa.test` | DOCENTE_PECUARIO |
| `agricola@qa.test` | DOCENTE_AGRICOLA |
| `directora@qa.test` | DIRECTORA |
| `admin@qa.test` | ADMINISTRADOR |

Contraseña de laboratorio: `CTP27.admin2026` (reseteada únicamente en `gestionctp27_qa`).

## 4. Metodología con usuarios reales

1. Preparar datos QA (periodo abierto, fondos, Luna, siembra de tomate, cama libre, cultivo Lechuga).
2. Leer la instrucción de la ficha **sin indicar clics**.
3. Observar en silencio; anotar errores, dudas y pedidos de ayuda.
4. Ayuda solo si el participante se declara bloqueado; registrar nivel 1 (pista) o 2 (se muestra el camino).
5. Medir tiempo, intentos, completada sí/parcial/no.
6. Clasificar hallazgos: 0 cosmético · 1 leve · 2 serio · 3 bloqueo o pérdida de datos.

## 5. Distribución recomendada por sesión

| Participante | Pruebas |
|---|---|
| Docente pecuario | USAB-01, USAB-02 (unidad pecuaria), USAB-03, USAB-04, USAB-05, USAB-06 |
| Docente agrícola | USAB-01/02 (unidad agrícola), USAB-07, USAB-08 |
| Directora | USAB-10, luego USAB-09 (si no puede publicar, documentar el bloqueo) |
| Primera vez | USAB-02, USAB-08, USAB-10 |

## 6. Criterios de selección (recordatorio)

Priorizadas por probabilidad de error, gravedad, complejidad, frecuencia, dificultad de hallazgo, recuperación e importancia institucional. Ver matriz en `04-hallazgos-recomendaciones.md` y el canvas de priorización previo.

## 7. Limitaciones de esta fase técnica

- Se ejecutó en BD QA aislada, no en producción.
- El navegador automatizado (Playwright) no sustituye usuarios reales.
- No se inventaron resultados de participantes.
- Durante la primera puesta en marcha, `/login` devolvió 404 por caché `.next` corrupta; tras limpiar `.next` respondió 200. Debe verificarse en el equipo de las sesiones reales.
