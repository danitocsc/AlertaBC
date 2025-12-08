import sqlite3
import requests
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from interfaces import IWeatherRepository, IWeatherService, ILocationService
import postal_codes_bc

class WeatherRepositorySQLite(IWeatherRepository):
    def __init__(self, db_path: str):
        self.db_path = db_path

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        return conn

    def init_database(self) -> None:
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # Create weather data table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS weather_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                location TEXT NOT NULL,
                timestamp DATETIME NOT NULL,
                temperature REAL,
                precipitation REAL,
                precipitation_probability REAL,
                wind_speed REAL,
                humidity REAL,
                pressure REAL,
                alert_level TEXT,
                latitude REAL,
                longitude REAL,
                postal_code TEXT,
                location_name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create alerts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                location TEXT NOT NULL,
                alert_level TEXT NOT NULL,
                timestamp DATETIME NOT NULL,
                precipitation_value REAL,
                message TEXT,
                acknowledged BOOLEAN DEFAULT FALSE,
                latitude REAL,
                longitude REAL,
                postal_code TEXT,
                location_name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create user locations table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_locations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                postal_code TEXT,
                location_name TEXT,
                municipality TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Create historical events table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS historical_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT,
                precipitation_sum REAL,
                severity_level TEXT,
                latitude REAL,
                longitude REAL,
                UNIQUE(date, latitude, longitude)
            )
        ''')

        # Create historical checks table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS historical_checks (
                latitude REAL,
                longitude REAL,
                last_checked DATETIME,
                PRIMARY KEY (latitude, longitude)
            )
        ''')

        # Add indices
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_hist_events_loc ON historical_events(latitude, longitude)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_hist_checks_loc ON historical_checks(latitude, longitude)')
        
        conn.commit()
        conn.close()

    def save_weather_data(self, data: Dict[str, Any]) -> None:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO weather_data (
                location, timestamp, temperature, precipitation, 
                wind_speed, humidity, pressure, alert_level,
                latitude, longitude, postal_code, location_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            'user_location', data['timestamp'], data['temperature'], 
            data['precipitation'], data['wind_speed'], data['humidity'], 
            data['pressure'], data['alert_level'],
            data['latitude'], data['longitude'], data['postal_code'],
            data['location_name']
        ))
        conn.commit()
        conn.close()

    def save_alert(self, alert_data: Dict[str, Any]) -> None:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO alerts (
                location, alert_level, timestamp, precipitation_value, 
                message, latitude, longitude, postal_code, location_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            'user_location', alert_data['alert_level'], alert_data['timestamp'],
            alert_data['precipitation'], alert_data['message'],
            alert_data['latitude'], alert_data['longitude'], alert_data['postal_code'],
            alert_data['location_name']
        ))
        conn.commit()
        conn.close()

    def get_recent_alerts(self, limit: int = 20) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(f'SELECT * FROM alerts ORDER BY timestamp DESC LIMIT {limit}')
        rows = cursor.fetchall()
        conn.close()
        
        alerts = []
        for row in rows:
            alerts.append({
                'id': row['id'],
                'location': row['location'],
                'location_name': row['location_name'] if 'location_name' in row.keys() else row['location'],
                'alert_level': row['alert_level'],
                'timestamp': row['timestamp'],
                'message': row['message']
            })
        return alerts
        
    def get_alerts_after(self, timestamp: datetime) -> List[Any]:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM alerts 
            WHERE timestamp > ? 
            ORDER BY timestamp ASC
        ''', (timestamp.strftime('%Y-%m-%d %H:%M:%S'),))
        rows = cursor.fetchall()
        conn.close()
        return rows

    def save_user_location(self, session_id: str, location_info: Dict[str, Any]) -> None:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO user_locations (
                session_id, latitude, longitude, postal_code, 
                location_name, municipality
            ) VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            session_id,
            location_info['latitude'],
            location_info['longitude'],
            location_info.get('postal_code'),
            location_info.get('location_name'),
            location_info.get('municipality')
        ))
        conn.commit()
        conn.close()

    def check_historical_cache(self, lat: float, lon: float) -> Optional[datetime]:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT last_checked FROM historical_checks 
            WHERE latitude = ? AND longitude = ?
        ''', (lat, lon))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            try:
                return datetime.fromisoformat(row[0])
            except ValueError:
                return None
        return None

    def update_historical_cache(self, lat: float, lon: float) -> None:
        conn = self._get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO historical_checks (latitude, longitude, last_checked)
            VALUES (?, ?, ?)
        ''', (lat, lon, datetime.now().isoformat()))
        conn.commit()
        conn.close()

    def save_historical_events(self, events: List[Dict[str, Any]]) -> None:
        conn = self._get_connection()
        cursor = conn.cursor()
        for event in events:
            cursor.execute('''
                INSERT OR IGNORE INTO historical_events (date, precipitation_sum, severity_level, latitude, longitude)
                VALUES (?, ?, ?, ?, ?)
            ''', (event['date'], event['precipitation'], event['severity'], event['latitude'], event['longitude']))
        conn.commit()
        conn.close()

    def get_historical_events(self, lat: float, lon: float) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM historical_events 
            WHERE latitude = ? AND longitude = ?
            ORDER BY date DESC
        ''', (lat, lon))
        rows = cursor.fetchall()
        conn.close()
        
        results = []
        for row in rows:
            results.append({
                'date': row['date'],
                'precipitation_sum': row['precipitation_sum'],
                'severity_level': row['severity_level']
            })
        return results


class WeatherServiceOpenMeteo(IWeatherService):
    BASE_URL = "https://api.open-meteo.com/v1/forecast"
    ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"

    def get_weather_data(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        print(f"Fetching weather for {lat}, {lon}...")
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,precipitation,rain,showers,weather_code,wind_speed_10m,relative_humidity_2m,surface_pressure",
            "hourly": "precipitation_probability,precipitation,temperature_2m,weather_code",
            "daily": "precipitation_sum,precipitation_probability_max",
            "timezone": "America/Tijuana",
            "forecast_days": 2
        }
        
        try:
            response = requests.get(self.BASE_URL, params=params, timeout=2)
            response.raise_for_status()
            print("Weather API success")
            return response.json()
        except requests.RequestException as e:
            print(f"Error fetching weather data: {e}. Using MOCK data.")
            return self.get_mock_weather_data()

    def get_forecast(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": "precipitation",
            "timezone": "America/Tijuana",
            "forecast_days": 2
        }
        try:
            response = requests.get(self.BASE_URL, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Error fetching forecast data: {e}")
            return None

    def get_historical_data(self, lat: float, lon: float, start_date: str, end_date: str) -> Optional[Dict[str, Any]]:
        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": start_date,
            "end_date": end_date,
            "daily": "precipitation_sum",
            "timezone": "America/Tijuana"
        }
        try:
            response = requests.get(self.ARCHIVE_URL, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Error fetching historical data: {e}")
            return None

    def get_mock_weather_data(self):
        return {
            "current": {
                "temperature_2m": 22.5,
                "precipitation": 0.0,
                "rain": 0.0,
                "showers": 0.0,
                "weather_code": 1,
                "wind_speed_10m": 12.0,
                "relative_humidity_2m": 45,
                "surface_pressure": 1015.0
            },
            "hourly": {
                "time": [datetime.now().replace(microsecond=0, second=0, minute=0).isoformat() for _ in range(24)],
                "precipitation_probability": [0] * 24,
                "precipitation": [0.0] * 24,
                "temperature_2m": [22.0] * 24,
                "weather_code": [1] * 24
            },
            "daily": {
                "precipitation_sum": [0.0, 0.0],
                "precipitation_probability_max": [0, 0]
            }
        }

class LocationServiceLocal(ILocationService):
    def get_location_by_postal_code(self, postal_code: str) -> Optional[Dict[str, Any]]:
        return postal_codes_bc.get_location_info_by_postal_code(postal_code)

    def validate_postal_code(self, postal_code: str) -> bool:
        return postal_codes_bc.validate_postal_code(postal_code)

    def find_closest_postal_code(self, lat: float, lon: float) -> Optional[str]:
        all_codes = postal_codes_bc.get_all_postal_codes()
        closest_code = None
        min_distance = float('inf')
        
        for code, info in all_codes.items():
            distance = ((lat - info['lat'])**2 + (lon - info['lon'])**2)**0.5
            if distance < min_distance:
                min_distance = distance
                closest_code = code
        
        return closest_code
