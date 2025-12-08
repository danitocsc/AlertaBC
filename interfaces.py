from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from datetime import datetime

class IWeatherRepository(ABC):
    """Interfaz para el acceso a datos meteorológicos y alertas."""
    
    @abstractmethod
    def init_database(self) -> None:
        """Inicializa la estructura de la base de datos."""
        pass

    @abstractmethod
    def save_weather_data(self, data: Dict[str, Any]) -> None:
        """Guarda datos meteorológicos procesados."""
        pass

    @abstractmethod
    def save_alert(self, alert_data: Dict[str, Any]) -> None:
        """Guarda una alerta en la base de datos."""
        pass

    @abstractmethod
    def get_recent_alerts(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Obtiene las alertas más recientes."""
        pass
    
    @abstractmethod
    def get_alerts_after(self, timestamp: datetime) -> List[Any]:
        """Obtiene alertas generadas después de un timestamp específico."""
        pass

    @abstractmethod
    def save_user_location(self, session_id: str, location_info: Dict[str, Any]) -> None:
        """Registra la ubicación de un usuario."""
        pass
        
    @abstractmethod
    def check_historical_cache(self, lat: float, lon: float) -> Optional[datetime]:
        """Verifica si existen datos históricos en caché."""
        pass
        
    @abstractmethod
    def update_historical_cache(self, lat: float, lon: float) -> None:
        """Actualiza la fecha de cache de datos históricos."""
        pass
        
    @abstractmethod
    def save_historical_events(self, events: List[Dict[str, Any]]) -> None:
        """Guarda eventos históricos de lluvia."""
        pass
        
    @abstractmethod
    def get_historical_events(self, lat: float, lon: float) -> List[Dict[str, Any]]:
        """Obtiene eventos históricos para una ubicación."""
        pass

class IWeatherService(ABC):
    """Interfaz para obtener datos meteorológicos externos."""

    @abstractmethod
    def get_weather_data(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """Obtiene datos actuales y pronóstico."""
        pass

    @abstractmethod
    def get_forecast(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        """Obtiene pronóstico detallado."""
        pass

    @abstractmethod
    def get_historical_data(self, lat: float, lon: float, start_date: str, end_date: str) -> Optional[Dict[str, Any]]:
        """Obtiene datos históricos."""
        pass

class ILocationService(ABC):
    """Interfaz para servicios de ubicación y geocodificación."""
    
    @abstractmethod
    def get_location_by_postal_code(self, postal_code: str) -> Optional[Dict[str, Any]]:
        """Obtiene información de ubicación por código postal."""
        pass
        
    @abstractmethod
    def validate_postal_code(self, postal_code: str) -> bool:
        """Valida un código postal."""
        pass
        
    @abstractmethod
    def find_closest_postal_code(self, lat: float, lon: float) -> Optional[str]:
        """Encuentra el código postal más cercano a las coordenadas."""
        pass
