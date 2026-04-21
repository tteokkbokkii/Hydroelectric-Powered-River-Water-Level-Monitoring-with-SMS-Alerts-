import paho.mqtt.client as mqtt
import json
import time
import random
from datetime import datetime, timedelta

# --- CONFIGURATION ---
MQTT_SERVER = "127.0.0.1" 
MQTT_TOPIC = "sensor/hulo/reading"
STATUS_TOPIC = "system/status"
SIGNAL_TOPIC = "system/signal"

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)

# Memory for Linear Regression
history_levels = []
history_times = []

def calculate_prediction(new_level):
    """Simple Linear Regression to predict level in 5 minutes"""
    history_levels.append(new_level)
    history_times.append(time.time())
    
    # Keep only last 5 points for the trend
    if len(history_levels) > 5:
        history_levels.pop(0)
        history_times.pop(0)
        
    if len(history_levels) < 2:
        return round(new_level + 0.1, 2)

    # Linear Regression Formula (y = mx + b)
    n = len(history_levels)
    sum_x = sum(history_times)
    sum_y = sum(history_levels)
    sum_xx = sum(x*x for x in history_times)
    sum_xy = sum(x*y for x, y in zip(history_times, history_levels))
    
    denominator = (n * sum_xx - sum_x**2)
    if denominator == 0: return round(new_level, 2)
    
    slope = (n * sum_xy - sum_x * sum_y) / denominator
    intercept = (sum_y - slope * sum_x) / n
    
    # Predict value 300 seconds (5 mins) into the future
    prediction = slope * (time.time() + 500) + intercept
    return round(max(0, prediction), 2)

# --- CONNECT TO BROKER ---
try:
    client.connect(MQTT_SERVER, 1883)
    print(f"🚀 Simulator started. Sending data to {MQTT_SERVER}...")
except Exception as e:
    print(f"❌ Connection Error: {e}")
    exit()

# --- SYSTEM STATUS OBJECT ---
# Contains keys for both the Footer.jsx logic and SystemTab.jsx UI
status_msg = {
    "uptime": "00d 04h 20m",
    "signal_quality": "EXCELLENT",
    "network_type": "WIFI",
    "rpi_online": True,
    "esp_connected": True,
    "ultrasonic_active": True,
    "float_ready": True,
    "rtc_synced": True,
    "gsm_status": "READY",
    "ultrasonic_connected": True, # Required by Footer.jsx
    "float_connected": True,      # Required by Footer.jsx
    "reset_reason": "SOFTWARE"    # Set to anything other than POWER_ON
}

# --- LIVE DATA LOOP ---
current_level = 7.5 # Starting height in feet

while True:
    now = datetime.now()
    
    # 1. Generate realistic water movement
    # Small random fluctuations to simulate ripples/tide
    current_level += random.uniform(-0.10, 0.15) 
    current_level = max(2.0, min(12.0, current_level)) # Stay within physical limits
    
    # 2. Calculate trend-based prediction
    prediction = calculate_prediction(current_level)
    
    # 3. Determine Range based on default thresholds
    status_range = "SAFE"
    if current_level >= 9.5: 
        status_range = "CRITICAL"
    elif current_level >= 8.0: 
        status_range = "WARNING"

    # 4. Prepare Sensor Payload
    reading_payload = {
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%H:%M:%S"),
        "distance": round(current_level, 2),
        "range": status_range,
        "predicted": prediction
    }
    
    # 5. Prepare Signal Strength Payload (4 bars = Full)
    signal_payload = {"bars": 4}

    # 6. PUBLISH TO MQTT
    # Publish reading
    client.publish(MQTT_TOPIC, json.dumps(reading_payload), retain=True)
    
    # Publish status (Every loop to ensure Footer stays Green/Normal)
    client.publish(STATUS_TOPIC, json.dumps(status_msg), retain=True)
    
    # Publish signal bars
    client.publish(SIGNAL_TOPIC, json.dumps(signal_payload), retain=True)
    
    print(f"📡 {reading_payload['time']} | Level: {reading_payload['distance']} ft. | Prediction: {prediction} ft. | Status: {status_range}")
    
    time.sleep(1)