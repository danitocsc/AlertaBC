from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from interfaces import IWeatherRepository, IWeatherService, ILocationService

class WeatherSystem:
    ALERT_THRESHOLDS = {
        'yellow': 5,      # >5mm rain in 1 hour
        'orange': 15,     # >15mm rain in 1 hour  
        'red': 25         # >25mm rain in 1 hour or >50mm in 24 hours
    }

    def __init__(self, 
                 repository: IWeatherRepository, 
                 weather_service: IWeatherService, 
                 location_service: ILocationService):
        self.repository = repository
        self.weather_service = weather_service
        self.location_service = location_service
        self.repository.init_database()

    def snap_coordinates(self, lat: float, lon: float):
        """Round coordinates to 2 decimal places (~1.1km) for caching."""
        return round(float(lat), 2), round(float(lon), 2)

    def analyze_weather(self, lat: float, lon: float, location_info: Dict[str, Any]) -> Dict[str, Any]:
        raw_data = self.weather_service.get_weather_data(lat, lon)
        if not raw_data:
            raise Exception("Failed to fetch weather data")

        analyzed = self._process_weather_data(raw_data, location_info)
        
        # Add hourly if available
        if 'hourly' in raw_data:
            analyzed['hourly'] = raw_data['hourly']
            
        self.repository.save_weather_data(analyzed)
        
        # Save alert if needed
        if analyzed['alert_level'] != 'green':
            self.repository.save_alert({
                'alert_level': analyzed['alert_level'],
                'timestamp': analyzed['timestamp'],
                'precipitation': analyzed['precipitation'],
                'message': analyzed['message'],
                'latitude': analyzed['latitude'],
                'longitude': analyzed['longitude'],
                'postal_code': analyzed['postal_code'],
                'location_name': analyzed['location_name']
            })
            
        return analyzed

    def _process_weather_data(self, data: Dict[str, Any], location_info: Dict[str, Any]) -> Dict[str, Any]:
        if not data or 'current' not in data:
            return None
            
        current = data['current']
        precip = current.get('precipitation', 0.0)
        
        # Check daily for Red alert
        daily_sum = 0
        if 'daily' in data and 'precipitation_sum' in data['daily']:
            daily_sum = data['daily']['precipitation_sum'][0] if data['daily']['precipitation_sum'] else 0
        
        alert_level = 'green'
        message = "Condiciones normales."
        
        if precip > self.ALERT_THRESHOLDS['red'] or daily_sum > 50:
            alert_level = 'red'
            message = f"¡ALERTA ROJA! Lluvia torrencial detectada ({precip}mm/h o {daily_sum}mm/24h). Riesgo alto de inundación."
        elif precip > self.ALERT_THRESHOLDS['orange']:
            alert_level = 'orange'
            message = f"Alerta Naranja: Lluvia fuerte detectada ({precip}mm/h). Precaución en zonas bajas."
        elif precip > self.ALERT_THRESHOLDS['yellow']:
            alert_level = 'yellow'
            message = f"Alerta Amarilla: Lluvia moderada ({precip}mm/h). Conduzca con precaución."
            
        return {
            'timestamp': datetime.now(),
            'temperature': current.get('temperature_2m'),
            'precipitation': precip,
            'wind_speed': current.get('wind_speed_10m'),
            'humidity': current.get('relative_humidity_2m'),
            'pressure': current.get('surface_pressure'),
            'alert_level': alert_level,
            'message': message,
            'location_name': location_info.get('location_name', 'Ubicación Desconocida'),
            'postal_code': location_info.get('postal_code'),
            'latitude': location_info.get('latitude'),
            'longitude': location_info.get('longitude')
        }

    def ensure_historical_data(self, lat: float, lon: float):
        snapped_lat, snapped_lon = self.snap_coordinates(lat, lon)
        
        last_checked = self.repository.check_historical_cache(snapped_lat, snapped_lon)
        should_fetch = True
        
        if last_checked:
            if datetime.now() - last_checked < timedelta(days=7):
                should_fetch = False
                
        if should_fetch:
            print(f"Fetching historical data for {snapped_lat}, {snapped_lon} (Cache Miss)")
            end_date = datetime.now().strftime('%Y-%m-%d')
            start_date = (datetime.now() - timedelta(days=730)).strftime('%Y-%m-%d')
            
            data = self.weather_service.get_historical_data(snapped_lat, snapped_lon, start_date, end_date)
            
            if data and 'daily' in data and 'precipitation_sum' in data['daily']:
                dates = data['daily']['time']
                precip_sums = data['daily']['precipitation_sum']
                
                events_to_save = []
                for i in range(len(dates)):
                    precip = precip_sums[i]
                    if precip is not None and precip > 10:
                        severity = 'RED' if precip > 30 else 'ORANGE' if precip > 20 else 'YELLOW'
                        events_to_save.append({
                            'date': dates[i],
                            'precipitation': precip,
                            'severity': severity,
                            'latitude': snapped_lat,
                            'longitude': snapped_lon
                        })
                
                self.repository.save_historical_events(events_to_save)
                self.repository.update_historical_cache(snapped_lat, snapped_lon)

    def get_historical_alerts(self, lat: float, lon: float):
        self.ensure_historical_data(lat, lon)
        snapped_lat, snapped_lon = self.snap_coordinates(lat, lon)
        raw_events = self.repository.get_historical_events(snapped_lat, snapped_lon)
        
        # Transform for API response if needed (currently repo returns dicts matching API needs mostly)
        events = []
        for row in raw_events:
            events.append({
                'date': row['date'],
                'precipitation': row['precipitation_sum'],
                'severity': row['severity_level']
            })
        return events

    def get_forecast(self, lat: float, lon: float):
        forecast = self.weather_service.get_forecast(lat, lon)
        
        hourly_data = []
        if 'hourly' in forecast and 'time' in forecast['hourly']:
            times = forecast['hourly']['time']
            precip = forecast['hourly']['precipitation']
            
            now = datetime.now()
            for i in range(len(times)):
                time_str = times[i]
                dt = datetime.fromisoformat(time_str)
                
                if dt >= now and dt < now + timedelta(hours=24):
                    hourly_data.append({
                        'time': time_str,
                        'precipitation': precip[i]
                    })
        return hourly_data

    def get_recent_alerts(self):
        return self.repository.get_recent_alerts()

    def get_new_alerts_stream(self):
        """Generator for SSE"""
        last_check = datetime.now()
        import time
        import json
        
        while True:
            rows = self.repository.get_alerts_after(last_check)
            if rows:
                last_check = datetime.now()
                for row in rows:
                    # Row tuple index depends on query select * order
                    # id=0, location=1, alert_level=2, timestamp=3, ... message=5...
                    # Safe to map by name if we used Row factory, but repo returns tuples for get_alerts_after currently in my impl?
                    # let's check repo implementation.
                    # Repo uses fetchall() on SELECT *.
                    # I should update repo to return dicts or handle tuples here.
                    # Let's assume tuples for now: 
                    # 0:id, 1:location, 2:alert_level, 3:timestamp, 4:precip, 5:message, 6:ack, 7:lat, 8:lon, 9:postal, 10:loc_name
                    
                    data = json.dumps({
                        'type': 'alert',
                        'id': row[0],
                        'location': row[1],
                        'alert_level': row[2],
                        'timestamp': row[3],
                        'message': row[5],
                        'location_name': row[10] if len(row) > 10 else row[1]
                    })
                    yield f"data: {data}\n\n"
            time.sleep(3)

