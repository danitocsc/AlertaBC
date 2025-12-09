# Arreglos de Geolocalización y Notificaciones iOS

## Resumen de Cambios

Se han realizado configuraciones específicas para habilitar el soporte de **Progressive Web App (PWA)** en iOS, lo cual es requisito indispensable para acceder a ciertas capacidades del sistema (como notificaciones push web modernas) y mejorar la fiabilidad de la geolocalización en Safari.

### 1. Habilitación de PWA (iOS Support)

- **Manifest**: Se creó `static/manifest.json` definiendo la aplicación como `standalone`. Esto permite que al usar "Agregar a inicio" en un iPhone, la app se abra como una aplicación nativa, activando permisos adicionales.
- **Service Worker**: Se implementó `static/sw.js` y se registró en `app.js`. El Service Worker es un requisito técnico para que la app sea considerada "instalable" y gestione recursos en segundo plano.
- **Icono**: Se agregó un icono básico (`icon.svg`) necesario para la instalación en pantalla de inicio.
- **Meta Tags**: Se añadieron etiquetas `apple-mobile-web-app-*` en el HTML para asegurar la correcta visualización en modo pantalla completa.

### 2. Configuración de Servidor para PWA

- Se agregó una ruta `/sw.js` en Flask (`cliente.py`) que sirve el Service Worker desde la raíz del dominio. Esto es crucial porque un SW servido desde `/static/` no tiene permiso para interceptar peticiones de la página principal (`/`), lo que rompería la funcionalidad PWA.

### 3. Debugging de Geolocalización

- La función de geolocalización se ha verificado. Ya se ejecuta como respuesta directa a un evento de usuario (`onclick`), lo cual cumple con los requisitos de seguridad de Safari.
- El problema anterior probablemente se debía a la falta de contexto seguro (HTTPS) o a inconsistencias en el estado de permisos que se resuelven al funcionar como PWA instalada.

## Pasos de Verificación

1.  **Limpiar Caché**: Es posible que sea necesario recargar la página (o borrar caché) para ver los cambios.
2.  **En iPhone (Safari)**:
    *   Navegar a `https://alerta.tijuana.cloud`.
    *   Pulsar el botón **"Compartir"** (cuadrado con flecha hacia arriba).
    *   Seleccionar **"Agregar a Inicio"**.
    *   Abrir la nueva app "Alerta BC" desde la pantalla de inicio.
3.  **Probar Funcionalidades**:
    *   **Ubicación**: Pulsar "Buscar tu ubicación". Debería solicitar permiso nativo de iOS una sola vez.
    *   **Notificaciones**: Ir a "Ajustes" -> "Notificaciones". Pulsar el botón. iOS pedirá permiso para enviar notificaciones.

Estos cambios alinean la aplicación con los estándares modernos de Web Apps en el ecosistema Apple.
