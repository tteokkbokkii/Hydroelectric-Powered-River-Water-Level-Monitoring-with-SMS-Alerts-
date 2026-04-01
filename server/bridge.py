import sqlite3
import json
import paho.mqtt.client as mqtt
import time
import threading
import subprocess
import re

# Configuration
MQTT_TOPIC = "sensor/hulo/reading"
STATUS_TOPIC = "system/status"
MQTT_SERVER = "127.0.0.1"
DB_PATH = "river_monitor.db"

# Global state to track connectivity
last_esp_contact = 0
START_TIME = time.time()

def get_wifi_rssi():
    try:
        # Pulls actual WiFi signal strength from the Pi system
        cmd = subprocess.check_output(["iwconfig", "wlan0"], stderr=subprocess.STDOUT).decode()
        signal = re.search(r"Signal level=(-?\d+)", cmd)
        if signal:
            dbm = int(signal.group(1))
            if dbm >= -50: return "EXCELLENT"
            if dbm >= -60: return "GOOD"
            if dbm >= -70: return "FAIR"
            return "WEAK"
    except:
        return "N/A"
    return "UNKNOWN"

def get_uptime_string():
    seconds = int(time.time() - START_TIME)
    days, seconds = divmod(seconds, 86400)
    hours, seconds = divmod(seconds, 3600)
    minutes, seconds = divmod(seconds, 60)
    return f"{days:02d}d {hours:02d}h {minutes:02d}m"

def broadcast_status(client):
    global last_esp_contact
    
    # Logic: If no message from ESP32 for 30 seconds, mark as DISCONNECTED
    esp_online = (time.time() - last_esp_contact) < 30
    
    status_payload = {
        "uptime": get_uptime_string(),
        "signal_quality": get_wifi_rssi(),
        "network_type": "WIFI",
        "rpi_online": True, # If this script is running, Pi is online
        "esp_connected": esp_online,
        "ultrasonic_active": esp_online, # Assuming if ESP is on, sensor is active
        "float_ready": True,
        "rtc_synced": True, 
        "gsm_status": "READY"
    }
    client.publish(STATUS_TOPIC, json.dumps(status_payload))

def heartbeat_loop(client):
    while True:
        broadcast_status(client)
        time.sleep(5) # Update dashboard every 5 seconds

def on_message(client, userdata, msg):
    global last_esp_contact
    try:
        if msg.topic == MQTT_TOPIC:
            last_esp_contact = time.time() # Update the "last seen" timer
            data = json.loads(msg.payload.decode())
            # ... (your existing DB save logic) ...
            print(f"Logged sensor data. ESP32 is ACTIVE.")
    except Exception as e:
        print(f"Error: {e}")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_message = on_message

try:
    client.connect(MQTT_SERVER, 1883)
    client.subscribe(MQTT_TOPIC)
    
    # Start the background status updater
    threading.Thread(target=heartbeat_loop, args=(client,), daemon=True).start()
    
    print("Bridge active. Monitoring ESP32 and System Health...")
    client.loop_forever()
except Exception as e:
    print(f"Connection failed: {e}")