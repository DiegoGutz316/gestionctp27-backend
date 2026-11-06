# Hallazgos y recomendaciones — Usabilidad GestiónCTP27

Clasificación:

- **Confirmado (código + ejecución técnica):** reproducido en API y/o UI automatizada.
- **Hipótesis:** plausible según perfiles; pendiente de sesiones reales.
- **Gravedad:** 0 cosmético · 1 leve · 2 serio · 3 bloqueo / pérdida de datos o dinero.

---

## A. Problemas confirmados

| ID | Hallazgo | Evidencia | Gravedad | Recomendación |
|---|---|---|---|---|
| H-01 | Formulario de asiento muestra **Ingresos y Egresos** a la vez; dual se rechaza con 400 | API dual 400; UI labels ingresos/egresos ≥2 | 2 | Un solo selector «Tipo de movimiento» + un monto |
| H-02 | Formato `85,000` no es número válido | API 400 «debe ser un número válido» | 2 | Aceptar miles locales o máscara clara + ejemplo 85000 |
| H-03 | **Anular** elimina físicamente el asiento; no pide motivo | DELETE + ausencia en listado; diálogo sin motivo | 3 | Anulación lógica + motivo obligatorio + confirmación explícita |
| H-04 | Categoría «TERNERA» inválida; válido `TERNERO` («Ternero/a») | API 400 vs 201 | 2 | Etiqueta/alias «Ternera» o texto de ayuda en el selector |
| H-05 | Tipo **Carne** también se acepta para vaca Luna | CARNE 201 y LECHE 201 | 2 | Confirmar regla de negocio; si es intencional, advertir en UI |
| H-06 | **Salud** no aparece como enlace en home pecuaria | Playwright `saludNav=0` | 3 | Incluir Salud (y Vacunas/Desparasitación) en la nav visible |
| H-07 | Sin camas `DISPONIBLE` la siembra queda bloqueada sin guía | API 400; selector vacío | 3 | Mensaje «No hay camas libres» + CTA «Registrar cama» |
| H-08 | Switch / query **cerrar ciclo** en el mismo flujo de cosecha | Código `cerrarCiclo`; captura `?cerrarCiclo=1` | 3 | Diálogo aparte para cerrar cultivo; default siempre off en cosecha parcial |
| H-09 | Directora **no puede publicar** avisos (403 REPORTES) | API 403 mensaje «Reportes» | 2 | Aclarar en UI el permiso; o política institucional explícita |
| H-10 | No existe menú **Reportes**; Avisos bajo **Análisis** | Playwright `reportesLinks=0`, `analisisText=1` | 2 | Renombrar/agrupar; atajo «Informe económico» para dirección |
| H-11 | Flyer del aviso es **paso posterior** al alta | PUT flyer tras POST | 2 | Un solo flujo «Publicar con imagen» o estado «Pendiente de imagen» |
| H-12 | Informe solo por ruta profunda; Excel funciona | Descarga `.xlsx` OK | 1–2 | Entrada visible desde Libro de Caja / panel dirección |
| H-13 | Etiqueta **Solicitar fondo** opaca para no técnicos | Código + flujo multi-paso | 2 | «Activar fondo inicial del libro» + asistente periodo→fondo→libro |
| H-14 | `/login` 404 por caché `.next` corrupta (entorno local) | Reproducido; se corrigió limpiando `.next` | 2 (ops) | Documentar limpieza de caché antes de demos/sesiones |

---

## B. Riesgos / hipótesis pendientes de usuarios reales

| ID | Hipótesis | Prueba asociada |
|---|---|---|
| R-01 | «Solicitar fondo» se interpreta como trámite externo | USAB-02 |
| R-02 | Usuarios buscan un módulo llamado Reportes | USAB-09, USAB-10 |
| R-03 | Activan «Finalizar la siembra» por costumbre al guardar | USAB-08 |
| R-04 | Confunden Salud con Vacunas | USAB-06 |
| R-05 | Anulan en vez de editar y no perciben la pérdida | USAB-03 |
| R-06 | Directora cree que puede publicar avisos | USAB-09 |

---

## C. Matriz de priorización (procesos)

Escala 1–5. Total /35. (Misma base del análisis previo; validada tras ejecución técnica.)

| ID | Proceso | Σ | Riesgo |
|---|---|---|---|
| USAB-01 | Registrar ingreso/egreso | 31 | Alto |
| USAB-02 | Solicitar fondo | 31 | Alto |
| USAB-08 | Cosecha sin cerrar ciclo | 30 | Alto |
| USAB-07 | Registrar siembra | 29 | Alto |
| USAB-09 | Publicar aviso + flyer | 28 | Alto |
| USAB-04 | Registrar bovino | 27 | Alto |
| USAB-05 | Registrar producción | 27 | Alto |
| USAB-03 | Anular vs editar | 26 | Alto |
| USAB-10 | Informe + Excel | 26 | Alto |
| USAB-06 | Salud | 25 | Medio-alto |

---

## D. Qué corregir antes de la entrega del proyecto (backlog UX)

Orden sugerido por gravedad e impacto institucional:

1. **Anulación lógica + motivo** (H-03) — dinero / auditoría.
2. **Separar cierre de ciclo de la cosecha parcial** (H-08).
3. **Nav pecuaria: Salud / Vacunas / Desparasitación visibles** (H-06).
4. **Empty state de siembra sin camas + CTA** (H-07).
5. **Asiento: un monto + tipo** (H-01) y formato numérico (H-02).
6. **Informe económico accesible para Directora** (H-10/H-12).
7. **Permisos y copy de Avisos / Reportes** (H-09/H-11).
8. **Vocabulario Ternera/Ternero** (H-04).

No implementar en esta tarea: solo documentado.
