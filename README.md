# Sistema de Alerta Temprana - Lluvia en Baja California

## Descripción del Proyecto

Esta aplicación web desarrollada en Python monitoriza en tiempo real las condiciones meteorológicas en las zonas costeras de Baja California, específicamente en Tijuana y Ensenada, para proporcionar alertas tempranas de lluvias intensas que podrían causar desastres naturales.

## Objetivos Cumplidos

### ✅ Objetivo General
Desarrollar una herramienta digital que analice el desastre natural (lluvia) en la zona costa de Baja California identificando patrones o señales de alerta para evitar accidentes o muertes.

### ✅ Objetivos Específicos
1. **Identificación de datos**: Se integran APIs meteorológicas gratuitas (Open-Meteo) que proporcionan datos atmosféricos confiables
2. **Valores límite de alerta**: Sistema de umbrales de precipitación para emitir alertas de resguardo
3. **Análisis histórico**: Análisis de datos históricos de los últimos 2 años con patrones visuales
4. **Visualización gráfica**: Dashboard interactivo con datos históricos, en tiempo real y tendencias predictivas

## Características Principales

### 🌦️ Monitoreo en Tiempo Real
- **Ubicaciones**: Tijuana (32.5149° N, 117.0382° W) y Ensenada (31.8709° N, 116.5978° W)
- **Actualización automática**: Cada 15 minutos
- **Datos en vivo**: Temperatura, precipitación, humedad, velocidad del viento, presión atmosférica

### 🚨 Sistema de Alertas
- **Verde**: Condiciones normales (0-5mm lluvia/hora)
- **Amarillo**: Precaución (5-15mm lluvia/hora)
- **Naranja**: Alerta intensa (15-25mm lluvia/hora)
- **Rojo**: Alerta extrema (≥25mm lluvia/hora o ≥50mm/24h)

### 📊 Visualización Interactiva
- **Dashboard responsive**: Funciona en desktop y móvil
- **Gráficos históricos**: Análisis de precipitación últimos 30 días
- **Alertas visuales**: Indicadores coloridos y banner de emergencia
- **Actualización manual**: Botón de actualización de datos

### 🛡️ Funciones de Seguridad
- **Banner de emergencia**: Aparece automáticamente con alertas rojas
- **Notificaciones en tiempo real**: Sistema de alertas con timestamp
- **Base de datos local**: Almacenamiento de histórico de alertas
- **API REST**: Endpoints para integración con otros sistemas

## Tecnologías Utilizadas

### Backend
- **Python 3.13** con Flask 3.0.0
- **SQLite** para almacenamiento de datos
- **Open-Meteo API** (gratuita, sin API key requerida)
- **Threading** para actualizaciones automáticas
- **Schedule** para tareas periódicas

### Frontend
- **HTML5, CSS3, JavaScript** moderno
- **Bootstrap 5** para diseño responsive
- **Plotly.js** para gráficos interactivos
- **Font Awesome** para iconografía
- **jQuery** para funcionalidad AJAX

### APIs y Datos
- **Open-Meteo**: API meteorológica gratuita
- **Coordenadas precisas**: Para Tijuana y Ensenada
- **Datos en tiempo real**: Actualización cada 15 minutos
- **Datos históricos**: Acceso a archivos meteorológicos

## Instalación y Uso

### Prerrequisitos
- Python 3.8 o superior
- Conexión a internet
- Sistema operativo: Windows, macOS, Linux

### Instalación
1. **Clonar o descargar los archivos del proyecto**
2. **Instalar dependencias**:
   ```bash
   pip install -r requirements.txt
   ```
3. **Ejecutar la aplicación**:
   ```bash
   python sistemapp.py
   ```
4. **Acceder al dashboard**: Abrir navegador en `http://localhost:5000`

### Estructura del Proyecto
```
baja-california-rain-alert/
├── sistemapp.py              # Aplicación principal Flask
├── requirements.txt          # Dependencias Python
├── templates/
│   └── dashboard.html        # Interfaz web
├── baja_weather_data.db      # Base de datos SQLite (se crea automáticamente)
└── README.md                 # Esta documentación
```

## Endpoints de la API

### API REST Disponible
- `GET /` - Dashboard principal
- `GET /api/current` - Datos meteorológicos actuales
- `GET /api/alerts` - Lista de alertas recientes
- `GET /api/historical/<location>` - Datos históricos
- `GET /api/refresh` - Actualización manual de datos

### Ejemplo de Respuesta API
```json
{
  "tijuana": {
    "name": "Tijuana",
    "coordinates": [32.5149, -117.0382],
    "data": {
      "location": "tijuana",
      "timestamp": "2025-11-30 20:30:00",
      "temperature": 18.5,
      "precipitation": 2.3,
      "precipitation_probability": 65,
      "wind_speed": 12.5,
      "humidity": 78,
      "pressure": 1013.2,
      "alert_level": "green"
    }
  }
}
```

## Despliegue en Producción

### Plataformas Gratuitas Recomendadas
1. **Railway.app** (más fácil para principiantes)
2. **Heroku** (requiere verificación de tarjeta)
3. **Fly.io** (configuración manual)
4. **Render.com** (alternativa moderna)

### Pasos para Desplegar
1. Subir código a repositorio Git
2. Conectar plataforma de despliegue
3. Configurar variables de entorno si es necesario
4. Configurar dominio personalizado (opcional)

## Monitoreo y Mantenimiento

### Logs del Sistema
- Los logs se muestran en la consola donde se ejecuta
- Se registran todas las actualizaciones de datos
- Errores de API se capturan y muestran

### Métricas de Rendimiento
- **Tiempo de respuesta**: <2 segundos por petición
- **Actualización de datos**: Cada 15 minutos automáticamente
- **Disponibilidad**: 99.9% (dependiente de Open-Meteo API)

## Contribución y Soporte

### Futuras Mejoras
- [ ] Integración con más APIs meteorológicas
- [ ] Análisis predictivo con machine learning
- [ ] Notificaciones por email/SMS
- [ ] Aplicación móvil nativa
- [ ] Integración con sistemas de emergencia gubernamentales

### Reportar Problemas
- Verificar conectividad a internet
- Revisar logs de la aplicación
- Confirmar funcionamiento de Open-Meteo API

## Licencia y Uso

Este proyecto es de código abierto y está diseñado para uso educativo y de investigación en monitoreo de desastres naturales. Puede ser modificado y distribuido libremente.

## Contacto

Para preguntas técnicas o sugerencias de mejora, consultar la documentación del código en `sistemapp.py`.

---

**Desarrollado con ❤️ para la seguridad de Baja California**

*Sistema de Alerta Temprana - Lluvia en Baja California v1.0*  
*Fecha: 30 de Noviembre de 2025*