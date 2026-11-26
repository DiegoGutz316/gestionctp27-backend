# Guía de evidencias

## Estructura

```text
docs/qa/usabilidad-real/evidencias/
  USAB-01/
  USAB-02/
  …
  USAB-10/
```

Cada carpeta ya existe (con `.gitkeep`).

## Convención de nombres

```text
{CODIGO-PARTICIPANTE}_{YYYYMMDD}_{descripcion-corta}.{ext}

Ejemplos:
P-PEC-01_20261110_saldo-despues-ingreso.png
P-DIR-01_20261112_excel-descargado.xlsx
P-AGR-02_20261111_observacion.md
```

## Qué guardar

| Tipo | ¿Cuándo? | Precauciones |
|------|----------|--------------|
| Captura de pantalla del sistema | Tras completar o ante error | Recortar datos personales ajenos |
| Archivo Excel exportado | USAB-10 | Puede versionarse si no tiene datos reales sensibles |
| Nota de observación `.md` | Siempre recomendable | Solo código de participante |
| Foto del puesto | Solo con permiso | Evitar rostros si no hay consentimiento |
| Video | Solo con consentimiento escrito | Guardar fuera del repo si es pesado; enlazar ruta local |

## Observación mínima sugerida

Crear en la carpeta de la prueba un archivo `P-xxx_observacion.md`:

```markdown
# USAB-0N — P-xxx
- Inicio:
- Fin:
- Errores:
- Ayudas:
- Resultado:
- Notas:
```

## Privacidad

- No usar nombres reales en nombres de archivo.
- No subir `CREDENCIALES.local.md`.
- No incluir dumps de BD en el repositorio (`backups/` está ignorado).
