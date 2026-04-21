import paho.mqtt.client as mqtt
import json
import time
import random
from datetime import datetime, timedelta

# Network Settings
MQTT_SERVER = "127.0.0.1" 
MQTT_TOPIC = "sensor/hulo/reading"
STATUS_TOPIC = "system/status"

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
    prediction = slope * (time.time() + 300) + intercept
    return round(max(0, prediction), 2)

try:
    client.connect(MQTT_SERVER, 1883)
    print(f"🚀 Simulator started. Sending data to {MQTT_SERVER}...")
except Exception as e:
    print(f"❌ Connection Error: {e}")
    exit()

# --- 1. SEND SYSTEM STATUS (To turn Footer Green) ---
status_msg = {
    "uptime": "00d 04h 20m",
    "signal_quality": "EXCELLENT",
    "network_type": "WIFI (hellnah)",
    "rpi_online": True,
    "esp_connected": True,
    "ultrasonic_active": True,
    "float_ready": True,
    "rtc_synced": True,
    "gsm_status": "READY",
    "ultrasonic_connected": True, # For Footer logic
    "float_connected": True,      # For Footer logic
    "reset_reason": "SOFTWARE"
}
client.publish(STATUS_TOPIC, json.dumps(status_msg))
print("✅ System Status Published (Footer should be Green)")

# --- 2. LIVE DATA LOOP ---
current_level = 7.5 # Start at a mid-point
while True:
    now = datetime.now()
    
    # Simulate a slow rising/falling tide
    current_level += random.uniform(-0.15, 0.2) 
    current_level = max(5.0, min(11.5, current_level)) # Constrain
    
    prediction = calculate_prediction(current_level)
    
    status = "SAFE"
    if current_level >= 9.5: status = "CRITICAL"
    elif current_level >= 8.0: status = "WARNING"

    data = {
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%H:%M:%S"),
        "distance": round(current_level, 2),
        "range": status,
        "predicted": prediction
    }
    
    client.publish(MQTT_TOPIC, json.dumps(data))
    print(f"📡 Published: {data['time']} | {data['distance']} ft. | Prediction: {prediction} ft.")
    
    # Occasionally refresh status to keep everything "Online"
    if random.random() > 0.8:
        client.publish(STATUS_TOPIC, json.dumps(status_msg))
        
    time.sleep(5)