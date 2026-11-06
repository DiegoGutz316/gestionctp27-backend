# Panel «Evaluación de usabilidad»

Registro y consulta de **sesiones reales** USAB-01…10. No inventa resultados ni marca las pruebas como aprobadas automáticamente.

## Separación de resultados

| Origen | Qué es | Dónde vive |
| --- | --- | --- |
| **Piloto técnico** | Codex, 10/10 PASS | `11-informe-piloto.md` (metadato en el panel) |
| **Sesiones reales** | Docentes/participantes del colegio | Tablas `qa_usab_*` + informe exportable |

Las estadísticas del panel **solo** cuentan sesiones con `origen = SESION_REAL`.

## Activación (solo QA)

Backend (`.env` / `.env.development.local`):

```env
QA_USABILIDAD_ENABLED=true
```

Frontend:

```env
NEXT_PUBLIC_QA_USABILIDAD_ENABLED=true
```

Sin el flag, las rutas API responden **404** y el menú no muestra la sección. En producción deje ambos apagados.

## Quién puede usarlo

Solo el rol **ADMINISTRADOR**. Directora y docentes **no** administran evaluaciones (siguen haciendo las tareas en los módulos normales).

## Cómo usarlo el día de las pruebas

1. Arranque API y frontend contra la BD QA (con migración `QaUsabilidadSesiones` aplicada).
2. Inicie sesión como administrador.
3. Menú **QA → Evaluación de usabilidad**.
4. Registre participantes anónimos (`DOC-01`, `DIR-01`, …) con rol de perfil.
5. Mientras el participante trabaja en Libro de caja / Pecuaria / Agrícola / Avisos-Informe, cronometre y anote errores/ayudas.
6. Cree la sesión (queda en **BORRADOR**), complete resultado y métricas, adjunte captura/PDF.
7. Pulse **Finalizar** cuando la observación esté completa.
8. Si debe corregir una sesión ya finalizada, indique el **motivo**; queda en el historial.
9. **Exportar informe** → `informe-usabilidad-ctp27.md` para la entrega universitaria.

Si no hay sesiones, el informe declara explícitamente que las pruebas con usuarios reales están **pendientes**.

## API (resumen)

- `GET /qa/usabilidad/catalogo` — USAB-01…10 + metadato del piloto
- `GET /qa/usabilidad/resumen` — KPIs de sesiones reales
- `POST /qa/usabilidad/participantes`
- `POST /qa/usabilidad/sesiones` / `PATCH …` / `POST …/finalizar`
- `POST /qa/usabilidad/sesiones/:id/evidencias` (multipart `archivo`)
- `GET /qa/usabilidad/informe.md`

## Migración

```bash
pnpm migration:run
```

Crea `qa_usab_participantes`, `qa_usab_sesiones`, `qa_usab_evidencias`, `qa_usab_historial`.
