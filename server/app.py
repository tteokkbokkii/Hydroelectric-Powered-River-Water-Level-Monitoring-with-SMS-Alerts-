from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), 'river_data.db')

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS water_levels 
                     (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                      sensor_type TEXT, 
                      level_value REAL, 
                      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    print("✅ Database Initialized!")

# --- NEW: THE "RECEIVER" DOOR ---
@app.route('/api/update', methods=['POST'])
def update_level():
    data = request.json
    sensor = data.get('sensor', 'ultrasonic')
    val = data.get('value')

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("INSERT INTO water_levels (sensor_type, level_value) VALUES (?, ?)", 
                     (sensor, val))
    return jsonify({"status": "success"}), 201

# --- THE "SENDER" DOOR ---
@app.route('/api/history', methods=['GET'])
def get_history():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.execute("SELECT id, sensor_type as sensor, level_value as value, timestamp as time FROM water_levels ORDER BY timestamp DESC LIMIT 50")
        rows = cursor.fetchall()
    
    # Convert database rows into JSON format for React
    result = [{"id": r[0], "sensor": r[1], "value": r[2], "time": r[3]} for r in rows]
    return jsonify(result)

if __name__ == '__main__':
    print("🚀 Attempting to start server...")
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)