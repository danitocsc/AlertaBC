# Reporte de Correcciones y Mejoras

## Resumen de Cambios

Este documento detalla las correcciones críticas aplicadas al entorno de despliegue Docker para restaurar la funcionalidad del sistema y asegurar su estabilidad en producción.

### 1. Inclusión de Dependencia Faltante (`gunicorn`)

- **Cambio:** Se agregó `gunicorn==21.2.0` al archivo `requirements.txt`.
- **Importancia:** 
  - El `Dockerfile` está configurado para iniciar la aplicación utilizando `gunicorn` como servidor WSGI de producción (CMD: `["gunicorn", ...]`).
  - Sin esta librería instalada en el entorno, el contenedor fallaba inmediatamente al intentar iniciar, causando que el servicio no estuviera disponible.
  - Esto soluciona errores de arranque tipo `executable file not found in $PATH`.

### 2. Corrección de Volúmenes en Docker Compose

- **Cambio:** Se eliminó la línea `- ./baja_weather_data.db:/app/baja_weather_data.db` del archivo `docker-compose.yml`, manteniendo únicamente el montaje del directorio raíz `- .:/app`.
- **Importancia:**
  - **Prevención de corrupción de tipos de archivo:** Cuando Docker intenta montar un archivo host que no existe (`baja_weather_data.db`), automáticamente crea un *directorio* con ese nombre en lugar de un archivo.
  - La aplicación espera un archivo SQLite. Al encontrar un directorio, lanzaba una excepción `sqlite3.OperationalError: unable to open database file` resultando en un **Error 500 (Internal Server Error)**.
  - Al permitir que la aplicación maneje la creación del archivo dentro del volumen general (o persistiendo solo si el archivo ya existe correctamente), eliminamos este conflicto.

## Estado Final

Con estas correcciones, el contenedor construye correctamente sus dependencias y la base de datos se inicializa sin conflictos de sistema de archivos, permitiendo que la aplicación responda a las peticiones HTTP/HTTPS correctamente.
