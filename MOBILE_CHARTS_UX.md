# Documentación de UX para Gráficas en Dispositivos Móviles

Este documento describe la configuración y criterios de diseño implementados para optimizar la experiencia de visualización de gráficas en dispositivos móviles (PWA).

## 1. Detección de Dispositivo
Utilizamos una función simple para determinar si el viewport corresponde a un dispositivo móvil.
- **Función:** `isMobileView()` en `static/app.js`
- **Breakpoint:** `< 768px` (Standard Tablet/Mobile breakpoint)
- **Comportamiento:**
  - Retorna `true` si `window.innerWidth` es menor a 768px.
  - Se utiliza para condicionales en tiempo de renderizado de la gráfica.

## 2. Configuración Diferenciada (Mobile vs Desktop)

| Característica | Mobile (Viewport < 768px) | Desktop (Viewport >= 768px) |
| :--- | :--- | :--- |
| **Volumen de Datos** | **Filtrado:** Se muestran solo los **últimos 25 eventos** para evitar saturación visual. | **Completo:** Se muestran todos los eventos históricos disponibles. |
| **Márgenes** | Optimizados para pantallas angostas: `{ t: 10, l: 30, r: 10, b: 40 }`. | Más amplios: `{ t: 10, l: 40, r: 20, b: 50 }`. |
| **Eje X (Fechas)** | Ticks reducidos (`nticks: 5`), rotación automática, fuente 11px. | Ticks lineales completos, fuente 10px. |
| **Interacción** | **Drag/Zoom desactivado** (`dragmode: false`, `scrollZoom: false`) para no interferir con el scroll vertical de la página. | Igual, para consistencia, pero el hover es más preciso. |
| **Barra de Herramientas** | Oculta (`displayModeBar: false`). | Oculta (para limpieza visual). |

## 3. Estilos y Layout
- **Contenedor:** La gráfica se aloja en un contenedor con clase `.chart-responsive-container`.
- **Altura:**
  - Controlada vía CSS en `dashboard.html`.
  - **Mobile:** ~280-300px.
  - **Desktop:** 300px.
- **Padding:** Se aplica `p-3` (1rem) en el contenedor padre para dar aire en móviles.
- **Colores:** Se utiliza el color primario de la marca (`#4f46e5`) para las barras, reservando los colores semánticos (Rojo/Naranja) solo para alertas críticas, manteniendo consistencia con la identidad visual.

## 4. Consideraciones de Desarrollo
- **Resize:** Se ha implementado un listener de `resize` en `window` para forzar el redibujado de Plotly (`Plotly.Plots.resize(gd)`) cuando cambia la orientación o tamaño de ventana.
- **Mantenimiento:** Al agregar nuevas gráficas, SIEMPRE verificar `isMobileView()` para ajustar densidad de datos y márgenes. Evitar tooltips que cubran toda la pantalla en móvil.
