import json
import paho.mqtt.client as mqtt
import time
import threading
from flask import Flask, jsonify, request
from flask_cors import CORS

MQTT_SERVER = "127.0.0.1"
SETTINGS_FILE = 'settings.json'
STATUS_TOPIC = "system/status"
MQTT_WILDCARD_TOPIC = "sensor/+/reading"

active_sensors = {}
START_TIME = time.time()

# --- FLASK API ---
app = Flask(__name__)
CORS(app)

@app.route('/api/data', methods=['GET'])
def get_live_data():
    """Returns the current 'Live' state of all detected sensors"""
    return jsonify(list(active_sensors.values()))

@app.route('/api/settings', methods=['GET', 'POST'])
def handle_settings():
    if request.method == 'GET':
        try:
            with open(SETTINGS_FILE, 'r') as f: return jsonify(json.load(f))
        except: return jsonify({"reading_interval": 5})
    if request.method == 'POST':
        with open(SETTINGS_FILE, 'w') as f: json.dump(request.json, f)
        return jsonify({"status": "success"})

# --- MQTT BRIDGE LOGIC ---
def on_message(client, userdata, msg):
    global active_sensors
    
    if "reading" in msg.topic:
        sensor_key = msg.topic.split('/')[1]
        
        try:
            payload = json.loads(msg.payload.decode())
            
            current_dist = payload.get("distance", 0)
            
            active_sensors[sensor_key] = {
                "id": f"{sensor_key.upper()}_01",
                "name": f"{sensor_key.capitalize()} Station",
                "level": current_dist,
                "predicted": current_dist + 0.5 if current_dist > 0 else 0,
                "status": payload.get("range", "NORMAL"),
                "last_update": time.strftime('%H:%M:%S')
            }
            
            print(f"📡 Scalability Update: {sensor_key.upper()} is now at {current_dist} ft")
            
        except Exception as e:
            print(f"❌ Error processing {sensor_key}: {e}")

def run_mqtt():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_message = on_message
    client.connect(MQTT_SERVER, 1883)
    client.subscribe(MQTT_WILDCARD_TOPIC)
    
    print("🟢 MQTT Bridge Active: Listening for multiple sensors...")
    client.loop_forever()

# --- MAIN EXECUTION ---
if __name__ == '__main__':
    # Thread 1: Listen for MQTT data from any number of sensors
    mqtt_thread = threading.Thread(target=run_mqtt, daemon=True)
    mqtt_thread.start()
    
    # Thread 2: Serve the data to your React TestPage.jsx
    print("🚀 Scalability Test Server running on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)