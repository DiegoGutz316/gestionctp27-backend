# Documentación técnica — Backend GestiónCTP27

API NestJS del sistema de gestión del **Colegio Técnico Profesional 27 de Abril**.

Este directorio documenta el stack, la arquitectura, la lógica de negocio y cada módulo del backend (`gestionctp27-backend`).

## Índice

| Documento | Contenido |
|-----------|-----------|
| [Stack y arquitectura](./stack-y-arquitectura.md) | Herramientas, bootstrap, capas, BD, despliegue |
| [Lógica de negocio](./logica-de-negocio.md) | Dominio transversal, roles, permisos, flujos |
| [Auth](./modulos/auth.md) | Login, JWT, CSRF, bloqueo, matriz de permisos |
| [Usuarios](./modulos/usuarios.md) | CRUD, roles, desactivación |
| [Agrícola](./modulos/agricola.md) | Cultivos, camas, siembras, tratamientos, cosechas |
| [Pecuaria](./modulos/pecuaria.md) | Animales, vacunas, desparasitaciones, salud, producción |
| [Inventario](./modulos/inventario.md) | Productos, stock, movimientos, idempotencia |
| [Libro de caja](./modulos/libro-caja.md) | Colegio, departamentos, periodos, asientos |
| [Reportes](./modulos/reportes.md) | Agregaciones y exportación PDF/Excel |
| [Comunicación](./modulos/comunicacion.md) | Avisos institucionales y flyers |
| [Dashboard](./modulos/dashboard.md) | Módulo placeholder (PANEL) |

## Contexto del sistema

GestiónCTP27 cubre operación productiva y administrativa del colegio técnico:

- **Producción agrícola** — ciclos de siembra → cuidados → cosecha
- **Producción pecuaria** — animales, sanidad y rendimiento
- **Inventario** — bodega de insumos/herramientas/equipos
- **Libro de caja** — fondos por unidad productiva y asientos
- **Reportes** — consultas y exportes de producción e inventario
- **Comunicación** — avisos y flyers institucionales
- **Usuarios y auth** — roles institucionales con matriz de permisos

El frontend vive en el repositorio hermano `gestionctp27-frontend`.
