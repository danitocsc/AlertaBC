"""
Baja California Rain Disaster Analysis Web Application - Personalized Location Version
=======================================================================================

A web application for monitoring and analyzing rainfall patterns in any location in Baja California
to provide early warning alerts for potential natural disasters based on user location.

Author: AI Assistant
Date: 2025-11-30
Version: 2.3 - Refactored with Dependency Injection
"""

import os
import threading
import time
import schedule
from flask import Flask, render_template, jsonify, request, session, Response
from implementations import WeatherRepositorySQLite, WeatherServiceOpenMeteo, LocationServiceLocal
from app_core import WeatherSystem

# Configuration
app = Flask(__name__)
app.secret_key = 'baja_california_rain_alert_system_2025'

# Database configuration
DATABASE = 'baja_weather_data.db'

# Session key for user location
USER_LOCATION_KEY = 'user_location'

# DEPENDENCY INJECTION SETUP
# 1. Instantiate concrete implementations
weather_repo = WeatherRepositorySQLite(DATABASE)
weather_service = WeatherServiceOpenMeteo()
location_service = LocationServiceLocal()

# 2. Inject dependencies into the core system
weather_system = WeatherSystem(
    repository=weather_repo,
    weather_service=weather_service,
    location_service=location_service
)

# Initialize database on startup
weather_system.repository.init_database()

def get_user_location():
    """Get location from session or return None."""
    if USER_LOCATION_KEY in session:
        return session[USER_LOCATION_KEY]
    return None

@app.route('/')
def index():
    """Render the main dashboard."""
    return render_template('dashboard.html')

@app.route('/api/location/search')
def search_location():
    """Search for a location by postal code."""
    postal_code = request.args.get('postal_code')
    
    if not postal_code:
        return jsonify({'error': 'Postal code required'}), 400
        
    # Validation via Service
    if not weather_system.location_service.validate_postal_code(postal_code):
        return jsonify({'error': 'Invalid postal code format'}), 400
        
    # Get location info via Service
    location_info = weather_system.location_service.get_location_by_postal_code(postal_code)
    
    if location_info:
        return jsonify(location_info)
    else:
        return jsonify({'error': 'Postal code not found in Baja California'}), 404

@app.route('/api/location/set', methods=['POST'])
def set_location():
    """Set the user's location in the session."""
    data = request.json
    location_info = None
    
    if 'postal_code' in data:
        # Set by postal code
        location_info = weather_system.location_service.get_location_by_postal_code(data['postal_code'])
        if location_info:
            location_info['postal_code'] = data['postal_code']
            
    elif 'latitude' in data and 'longitude' in data:
        # Set by coordinates
        lat = float(data['latitude'])
        lon = float(data['longitude'])
        
        # Use service to find closest postal code/location
        closest_code = weather_system.location_service.find_closest_postal_code(lat, lon)
        
        if closest_code:
            location_info = weather_system.location_service.get_location_by_postal_code(closest_code)
            location_info['postal_code'] = closest_code
        else:
            location_info = {
                'latitude': lat,
                'longitude': lon,
                'location_name': f"Ubicación ({lat:.4f}, {lon:.4f})",
                'postal_code': 'N/A',
                'municipality': 'Desconocido',
                'state': 'Baja California'
            }
            
    if location_info:
        # Normalize keys
        if 'lat' in location_info and 'latitude' not in location_info:
            location_info['latitude'] = location_info['lat']
        if 'lon' in location_info and 'longitude' not in location_info:
            location_info['longitude'] = location_info['lon']
        
        # Ensure location_name exists
        if 'location_name' not in location_info:
            colonia = location_info.get('colonia', '')
            municipio = location_info.get('municipio', '')
            location_info['location_name'] = f"{colonia}, {municipio}".strip(', ')

        session[USER_LOCATION_KEY] = location_info
        
        # Log to DB via Repository
        weather_system.repository.save_user_location(
            session.get('session_id', 'unknown'),
            location_info
        )
        
        return jsonify({'success': True, 'location': location_info})
    else:
        return jsonify({'error': 'Location not found'}), 404

@app.route('/api/location/current')
def get_current_location():
    """Get the currently set user location."""
    location = get_user_location()
    if location:
        return jsonify(location)
    else:
        return jsonify({'error': 'No location set'}), 404

@app.route('/api/location/user-weather')
def get_user_weather():
    """Get weather data for the user's specific location."""
    location = get_user_location()
    
    if not location:
        return jsonify({'error': 'Location not set'}), 400
        
    try:
        analyzed_data = weather_system.analyze_weather(
            location['latitude'], 
            location['longitude'],
            location
        )
        return jsonify({
            'location': location,
            'current_weather': analyzed_data
        })
    except Exception as e:
        print(f"Error getting weather: {e}")
        return jsonify({'error': 'Failed to fetch weather data'}), 500

@app.route('/api/alerts')
def get_alerts():
    """Get recent alerts."""
    alerts = weather_system.get_recent_alerts()
    return jsonify(alerts)

@app.route('/api/events')
def sse_events():
    """Server-Sent Events endpoint for real-time alerts."""
    return Response(weather_system.get_new_alerts_stream(), mimetype='text/event-stream')

@app.route('/api/historical-alerts')
def get_historical_alerts():
    """Return historical significant rain events for the user's location."""
    location = get_user_location()
    if not location:
        return jsonify([])

    events = weather_system.get_historical_alerts(location['latitude'], location['longitude'])
    return jsonify(events)



def update_weather_data():
    """Background task stub."""
    # Logic moved to generic scheduler if needed
    pass

if __name__ == '__main__':
    # Start background thread for data updates
    def run_scheduler():
        schedule.every(15).minutes.do(update_weather_data)
        while True:
            schedule.run_pending()
            time.sleep(60)
    
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()
    
    app.run(host='0.0.0.0', port=5000)