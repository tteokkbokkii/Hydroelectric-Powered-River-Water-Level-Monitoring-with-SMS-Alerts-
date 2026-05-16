import paho.mqtt.client as mqtt
import json
import time
import threading
from datetime import datetime, timedelta
from flask import Flask, jsonify
from flask_cors import CORS

# --- CONFIGURATION ---
MQTT_SERVER = "127.0.0.1" 
MQTT_TOPIC = "sensor/hulo/reading"
app = Flask(__name__)
CORS(app) 

# Simulation settings
CURRENT_INTERVAL = 4  # <--- Change this to 1 or 5 to test different speeds

# Global storage
latest_reading = {}
history_data = []

def run_simulation():
    global latest_reading, history_data
    
    # Starting level
    current_val = 1
    
    while True:
        # Determine Range based on your new 26ft scale logic
        status_range = "SAFE"
        if current_val >= 7.06: 
            status_range = "CRITICAL"
        elif current_val >= 4.01: 
            status_range = "WARNING"

        # Create a timestamp
        now = datetime.now()
        
        reading = {
            "date": now.strftime("%Y-%m-%d"),
            "time": now.strftime("%H:%M:%S"),
            "distance": round(current_val, 2),        
            "predicted": round(current_val + 0.2, 2), # This is the "Next Reading" prediction
            "range": status_range,                    
            "status": "NORMAL THRESHOLD" if status_range == "SAFE" else status_range
        }
        
        latest_reading = reading
        
        # Add to history (newest at the top for your dashboard logic)
        history_data.insert(0, reading)
        if len(history_data) > 20:
            history_data.pop()

        # Optional MQTT Broadcast
        try:
            client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
            client.connect(MQTT_SERVER, 1883)
            client.publish(MQTT_TOPIC, json.dumps(reading))
            client.disconnect()
        except:
            pass
            
        print(f"📡 SIMULATOR -> Level: {reading['distance']} ft | Next point expected in {CURRENT_INTERVAL}m")
        
        # In a real test, you'd sleep for CURRENT_INTERVAL * 60
        # For simulation, we sleep for 10 seconds so you can see the chart move
        time.sleep(10) 

# --- API ENDPOINTS ---

@app.route('/api/settings', methods=['GET'])
def get_settings():
    return jsonify({
        "threshold_normal": 0.0,
        "threshold_attention": 4.01,
        "threshold_critical": 7.06,
        "reading_interval": CURRENT_INTERVAL  
    })

@app.route('/api/data', methods=['GET']) 
def get_data():
    return jsonify(history_data if history_data else [latest_reading])

if __name__ == "__main__":
    sim_thread = threading.Thread(target=run_simulation, daemon=True)
    sim_thread.start()
    
    print(f"🚀 Simulator Server active. Interval set to: {CURRENT_INTERVAL} mins")
    app.run(port=5000, host='0.0.0.0', debug=False, use_reloader=False, threaded=True)