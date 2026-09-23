# Blueprint de PM Mobile

## Descripción general

PM Mobile es una aplicación Angular para acceder desde dispositivos móviles a los procesos operativos de Perú Motor. El menú principal se genera según los permisos que el API asigna al usuario autenticado y dirige a formularios protegidos por el guard de autenticación.

## Funcionalidades y diseño existentes

- Autenticación y rutas protegidas para los distintos procesos operativos.
- Menú lateral responsive con soporte para modo claro y oscuro.
- Opciones de menú filtradas con los permisos obtenidos para la aplicación `MOB`.
- Formularios de recepción, inventario, traslados, taller, checklist, mantenimiento, gastos, personal y cotizaciones de ventas.
- Formulario de cotización de repuestos con datos del cliente y vehículo, detalle de productos y generación de PDF.

## Cambios implementados

### 1. Actualización de Angular a 22.1.7 y resolución de licencia PrimeUI
- Actualización de dependencias `@angular/*` a `22.1.7`.
- Configuración de `primeng: ^21.1.10` y `@primeuix/themes: ^2.0.3` con `overrides` en `package.json`, evitando el requisito de licencia comercial de PrimeNG 22.
- Actualización de `typescript` a `~6.0.3`, `ngx-cookie-service` a `^22.0.0` y `@zxing/ngx-scanner` a `^22.0.1`.

### 2. Corrección de selección automática en combos (`<p-select>`)
- **Limpieza de proveedores de animación y bootstrap**: Se eliminó la doble provisión de animaciones en [`app.config.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/app.config.ts) (`provideAnimations()` en conflicto con `provideAnimationsAsync()`) y se limpió el arranque en [`main.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/main.ts).
- **Normalización de tipos en `optionValue`**: Los identificadores de opciones (`idSucursal`, `idAlmacen`, `idBrand`, etc.) se mapean de forma homogénea a `string` (`String(...)`), permitiendo que la comparación estricta (`===`) de PrimeNG seleccione inmediatamente el valor sin requerir clic manual.
- **Detección de cambios inmediata**: Se inyectó `ChangeDetectorRef` y se invocó `cdr.markForCheck()` en los callbacks de carga asíncrona en los componentes: [`recepcionvehiculos.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/recepcionvehiculos/recepcionvehiculos.ts), [`inventario-vehiculos.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/inventario-vehiculos/inventario-vehiculos.ts), [`reportecotventas.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/reportecotventas/reportecotventas.ts), [`traslado.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/traslado/traslado.ts), [`salida-trabajo.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/salida-trabajo/salida-trabajo.ts), [`mantenimiento-estados.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/mantenimiento-estados/mantenimiento-estados.ts), [`mantenimiento.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/mantenimiento/mantenimiento.ts), [`listarchecklist.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/listarchecklist/listarchecklist.ts), [`ingresosalidataller.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/ingresosalidataller/ingresosalidataller.ts) y [`checklist.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/checklist/checklist.ts).

### 3. Corrección del estado de carga en tablas (`<p-table [loading]="cargando">`)
- **Causa raíz identificada**: Al resolver datos mediante llamadas asíncronas con promesas/microtasks (`await this.resolverDescripcionesInventarios()`), las propiedades `cargando = false` se asignaban en microtareas que no notificaban automáticamente el ciclo de detección de cambios de Angular en Zone.js, dejando el overlay de carga activo hasta que el usuario realizaba un clic o interacción física en pantalla.
- **Solución integral aplicada**:
  - En [`inventario-vehiculos.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/inventario-vehiculos/inventario-vehiculos.ts): se agregaron llamadas a `cdr.markForCheck()` en `buscar()`, `cargarSaldoAlmacen()`, `cargarVehiculosInventario()` y `eliminarInventario()`.
  - En [`listarchecklist.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/listarchecklist/listarchecklist.ts): se sincronizó el ciclo en `cargarChecklists()`.
  - En [`personal.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/personal/personal.ts): se inyectó `ChangeDetectorRef` y se integró en `cargarPersonal()` y `cargarBancos()`.
  - En [`rendicion-gastos.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/rendicion-gastos/rendicion-gastos.ts): se inyectó `ChangeDetectorRef` y se sincronizaron las tablas de rendiciones, sucursales y proveedores.
  - En [`personalMarcacion.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/personalMarcacion/personalMarcacion.ts), [`misJustificaciones.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/misJustificaciones/misJustificaciones.ts), [`validacionJustificaciones.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/validacionJustificaciones/validacionJustificaciones.ts), [`homePersonal.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/homePersonal/homePersonal.ts) y [`detallechecklist.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/detallechecklist/detallechecklist.ts): se inyectó `ChangeDetectorRef` y se garantizó la reactividad inmediata de todos los estados de carga y listas.
- **Validación**: Compilación `ng build` completada con éxito (código de salida 0).

### 4. Corrección de transparencia en el Menú Lateral (`<p-drawer>`)
- **Causa raíz identificada**: En [`menu.css`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/menu/menu.css) las reglas de estilo globales para `.p-drawer`, `.p-drawer-header` y `.p-drawer-content` utilizaban `background: var(--surface-0);`. Al no existir la variable CSS `--surface-0` en `@primeuix/themes` (donde los tokens son `--p-drawer-background` o `--p-surface-0`), el navegador evaluaba la regla como inválida en tiempo de cómputo, dejando el contenedor con fondo transparente (`background: transparent`). Al reabrir el menú o superponerse con la máscara modal, el menú se visualizaba transparente.
- **Solución integral aplicada**:
  - En [`menu.css`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/menu/menu.css): Se definieron colores de fondo sólidos y opacos (`#ffffff` en modo claro y `#1e293b` en modo oscuro con `!important`), así como bordes y sombras para garantizar que el panel del menú lateral sea 100% opaco y legible en todo momento.
  - En [`menu.html`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/menu/menu.html): Se añadió `styleClass="!bg-white dark:!bg-slate-800 shadow-2xl"` en `<p-drawer>`.
  - En [`menu.ts`](file:///d:/Proyecto%20LoJusto/PM_MOBILE/src/app/menu/menu.ts): Se inyectó `ChangeDetectorRef` para asegurar la reactividad inmediata al alternar el drawer (`toggleDrawer()`), cambiar el tema (`toggleDarkMode()`) o actualizar la ruta activa.
- **Validación**: Compilación `ng build` completada con éxito (código de salida 0).

