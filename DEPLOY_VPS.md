# Guía de Despliegue en VPS (Docker)

Esta guía describe los pasos para desplegar la aplicación "Alerta Temprana BC" en un servidor virtual privado (VPS) usando Docker.

## 1. Requisitos Previos

- Acceso SSH a tu VPS (ej. AWS EC2, DigitalOcean Droplet, Linode).
- Sistema Operativo recomendado: Ubuntu 22.04 LTS o superior.
- Puertos abiertos en el firewall del VPS: `22` (SSH) y `5000` (Aplicación Web).

## 2. Preparar el Servidor

Conéctate a tu servidor y ejecuta los siguientes comandos para instalar Docker y Docker Compose:

```bash
# Actualizar repositorios
sudo apt update && sudo apt upgrade -y

# Instalar Docker
sudo apt install -y docker.io docker-compose-plugin

# Iniciar y habilitar Docker
sudo systemctl start docker
sudo systemctl enable docker

# Añadir tu usuario al grupo docker (para no usar sudo siempre)
sudo usermod -aG docker $USER
# (Cierra sesión y vuelve a entrar para aplicar el cambio de grupo)
```

## 3. Transferir Archivos

Puedes transferir los archivos usando Git (recomendado) o SCP.

### Opción A: Usando Git (Si tienes el proyecto en GitHub/GitLab)
```bash
git clone https://github.com/tu-usuario/tu-proyecto.git app
cd app
```

### Opción B: Usando SCP (Desde tu computadora local)
Ejecuta esto **en tu terminal local** (PowerShell o CMD):

```powershell
# Reemplaza 'usuario' e 'ip-del-servidor' con tus datos reales
scp -r "C:\Users\Daniel\OneDrive\00 aUNRC\2do Semestre\Programación para la Ciencia de Datos\pp\*" usuario@ip-del-servidor:~/app
```

Asegúrate de copiar todos los archivos esenciales:
- `Dockerfile`
- `docker-compose.yml`
- `requirements.txt`
- `*.py` (código fuente)
- `static/` y `templates/`
- `baja_weather_data.db` (si quieres mantener tus datos actuales)

## 4. Desplegar la Aplicación

Una vez en el servidor y dentro de la carpeta del proyecto (`~/app`):

```bash
# Construir y levantar los contenedores en segundo plano
docker compose up -d --build
```

## 5. Verificar el Estado

```bash
# Ver si el contenedor está corriendo
docker compose ps

# Ver logs en tiempo real
docker compose logs -f
```

La aplicación debería estar disponible ahora en: `http://ip-del-servidor:5000`

## Mantenimiento

Para actualizar la aplicación después de hacer cambios en el código:

1. Trae los cambios (git pull o scp de nuevo).
2. Reinicia el contenedor reconstruyéndolo:
```bash
docker compose up -d --build
```
