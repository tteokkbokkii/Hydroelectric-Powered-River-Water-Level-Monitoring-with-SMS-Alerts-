import paho.mqtt.client as mqtt
import json
import time
import random
from datetime import datetime, timedelta

# Since Mosquitto is running on your laptop (from the MATLAB folder)
MQTT_SERVER = "127.0.0.1" 
MQTT_TOPIC = "sensor/hulo/reading"

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)

try:
    client.connect(MQTT_SERVER, 1883)
    print(f"🚀 Simulator started. Sending data to {MQTT_SERVER}...")
except Exception as e:
    print(f"❌ Could not connect to Broker: {e}")
    exit()

# --- 1. INITIAL BURST (10 DATA POINTS) ---
# This fills your History Tab and Recent Logs immediately
print("📊 Sending 10 historical data points to fill your charts...")
for i in range(10, 0, -1):
    past_time = datetime.now() - timedelta(minutes=i * 5)
    
    data = {
        "date": past_time.strftime("%Y-%m-%d"),
        "time": past_time.strftime("%H:%M:%S"),
        "distance": round(random.uniform(7.0, 9.5), 2),
        "range": "SAFE",
        "predicted": round(random.uniform(8.0, 10.0), 2)
    }
    
    client.publish(MQTT_TOPIC, json.dumps(data))
    time.sleep(0.2) 

print("✅ History sent. Now entering LIVE mode (every 5s)...\n")

# --- 2. LIVE LOOP ---
while True:
    now = datetime.now()
    level = round(random.uniform(6.0, 11.0), 2)
    
    # Determine status for the Recent Logs color coding
    status = "SAFE"
    if level >= 10.5: status = "CRITICAL"
    elif level >= 9.0: status = "WARNING"

    data = {
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%H:%M:%S"),
        "distance": level,
        "range": status,
        "predicted": round(level + random.uniform(-0.2, 0.8), 2)
    }
    
    client.publish(MQTT_TOPIC, json.dumps(data))
    print(f"📡 Published Live: {data['time']} | {data['distance']} ft. | {data['range']}")
    time.sleep(5)