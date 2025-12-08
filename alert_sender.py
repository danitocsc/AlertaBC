import sqlite3
from flask import Flask, render_template, request, redirect, url_for, flash
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'alert_sender_secret_key_2025'
DATABASE = 'baja_weather_data.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    return render_template('sender_dashboard.html')

@app.route('/send_alert', methods=['POST'])
def send_alert():
    if request.method == 'POST':
        alert_type = request.form['alert_type']
        location = request.form['location']
        severity = request.form['severity']
        message = request.form['message']
        
        # Map severity to alert level
        alert_level_map = {
            'low': 'yellow',
            'medium': 'orange',
            'high': 'red'
        }
        alert_level = alert_level_map.get(severity, 'yellow')
        
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Construct a descriptive message if not provided
        if not message:
            type_names = {
                'flood': 'Inundación',
                'fire': 'Incendio',
                'rain': 'Lluvia Fuerte'
            }
            type_name = type_names.get(alert_type, 'Alerta')
            message = f"ALERTA DE {type_name.upper()} en {location}. Nivel: {alert_level.upper()}."

        conn = get_db_connection()
        try:
            # We insert into the existing alerts table. 
            # Note: The existing schema has columns: location, alert_level, timestamp, precipitation_value, message, acknowledged, latitude, longitude, postal_code, location_name
            # We will fill what we can.
            
            # Default coords for known locations (simplified)
            coords = {
                'Tijuana': (32.5149, -117.0382),
                'Ensenada': (31.8709, -116.5978)
            }
            lat, lon = coords.get(location, (0, 0))
            
            conn.execute('''
                INSERT INTO alerts (location, alert_level, timestamp, precipitation_value, message, latitude, longitude, location_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (location.lower(), alert_level, timestamp, 0, message, lat, lon, location))
            conn.commit()
            flash('Alerta enviada exitosamente!', 'success')
        except Exception as e:
            flash(f'Error al enviar alerta: {e}', 'danger')
        finally:
            conn.close()
            
        return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(port=5001, debug=True)
