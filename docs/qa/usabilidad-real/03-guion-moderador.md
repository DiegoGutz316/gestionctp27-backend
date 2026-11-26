# Guion del moderador

## Antes de la sesión (5–10 min, sin el participante)

1. Ejecutar `node scripts/qa/verify-usab-real.mjs` → todo PASS.
2. Confirmar API (`DB_NAME=gestionctp27_qa`, puerto acordado) y frontend apuntando a esa API.
3. Abrir sesión de prueba con el rol correcto; verificar periodo **USAB REAL — Evaluación**.
4. Cerrar sesión / dejar pantalla de login.
5. Preparar ficha impresa o digital en blanco (sin resultados rellenados).
6. Pedir consentimiento para observación y, si aplica, captura/video.
7. Asignar código anónimo (ej. `P-PEC-02`).

## Bienvenida (decir en voz alta)

> Gracias por participar. Vamos a usar el sistema de gestión del colegio con datos de prueba. No evaluamos su desempeño personal: evaluamos si el sistema es claro. Puede pensar en voz alta si se siente cómodo. No hay respuestas incorrectas. Si se atasca, diga lo que está buscando; yo anotaré y solo daré una pista si usted la pide o si acordamos un límite de tiempo.

## Consentimiento breve

- Participación voluntaria; puede detenerse cuando quiera.
- Se usará un código, no su nombre, en el informe.
- Capturas de pantalla del sistema: sí / no.
- Video del rostro o voz: solo con consentimiento explícito.

## Durante cada tarea

1. Leer **solo** la instrucción natural de la ficha (sección escenario).
2. Arrancar cronómetro cuando la persona empiece a interactuar.
3. No señalar botones ni menús.
4. Si pide ayuda: anotar +1 solicitud; ofrecer **una** pista breve (ej. “está relacionado con el dinero de la unidad”), no el paso a paso.
5. Si el entorno falla (error 500, sin red): marcar **Bloqueada por el entorno**, restaurar y no contabilizar como fallo de usabilidad.
6. Al terminar o abandonar: detener tiempo, verificar en pantalla/BD el resultado esperado, marcar evaluación.

## Entre tareas

- Ofrecer pausa corta.
- No adelantar la siguiente instrucción.
- Si la tarea anterior consumió un recurso crítico (p. ej. cama libre o código BOV), **no continuar** con otra persona sin restaurar baseline.

## Cierre

> ¿Qué le resultó más fácil? ¿Qué le resultó más confuso? ¿Cambiaría algo en los nombres del menú?

Agradecer. Guardar ficha y evidencias bajo `evidencias/USAB-xx/` con el código del participante.

## Frases prohibidas

- “Haga clic en Libro de Caja…”
- “El error que esperamos es…”
- “En la corrección H2 cambiamos…”
- Comparar en voz alta con otros participantes.
