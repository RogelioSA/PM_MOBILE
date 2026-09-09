# Blueprint de PM Mobile

## Descripción general

PM Mobile es una aplicación Angular para acceder desde dispositivos móviles a los procesos operativos de Perú Motor. El menú principal se genera según los permisos que el API asigna al usuario autenticado y dirige a formularios protegidos por el guard de autenticación.

## Funcionalidades y diseño existentes

- Autenticación y rutas protegidas para los distintos procesos operativos.
- Menú lateral responsive con soporte para modo claro y oscuro.
- Opciones de menú filtradas con los permisos obtenidos para la aplicación `MOB`.
- Formularios de recepción, inventario, traslados, taller, checklist, mantenimiento, gastos, personal y cotizaciones de ventas.
- Formulario de cotización de repuestos con datos del cliente y vehículo, detalle de productos y generación de PDF.

## Cambio actual: acceso a Proformas Repuestos

1. Registrar **Proformas Repuestos** en el catálogo del menú.
2. Asociar explícitamente el permiso `PROFORMASREPUESTOS` con la ruta existente `reporte_ventas`.
3. Mantener para las demás opciones la asociación convencional entre nombre del permiso y ruta.
4. Normalizar los permisos recibidos para tolerar mayúsculas, minúsculas, espacios y nombres nulos.
5. Validar el cambio con el compilador de Angular.
