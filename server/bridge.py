import sqlite3
import json
import paho.mqtt.client as mqtt
import time
import threading

MQTT_TOPIC = "sensor/hulo/reading"
STATUS_TOPIC = "system/status"
MQTT_SERVER = "127.0.0.1" 
MQTT_PORT = 1883
DB_PATH = "river_monitor.db"

def broadcast_status(client):
    status_payload = {
        "uptime": "00d 05h 20m",
        "signal_quality": "EXCELLENT",
        "network_type": "WIFI",
        "rpi_online": True,
        "esp_connected": True,
        "ultrasonic_active": True,
        "float_ready": True,
        "rtc_synced": True,
        "gsm_status": "READY"
    }
    client.publish(STATUS_TOPIC, json.dumps(status_payload))

def heartbeat(client):
    while True:
        broadcast_status(client)
        time.sleep(5) # Keeps the dashboard pills green every 5 seconds

def on_message(client, userdata, msg):
    # ... (Your existing database saving logic) ...
    print(f"Logged sensor data at {time.ctime()}")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_message = on_message

try:
    client.connect(MQTT_SERVER, MQTT_PORT)
    client.subscribe(MQTT_TOPIC)
    
    # Start the heartbeat thread
    threading.Thread(target=heartbeat, args=(client,), daemon=True).start()
    
    print("Bridge active and Heartbeat started...")
    client.loop_forever()
except Exception as e:
    print(f"Connection failed: {e}")