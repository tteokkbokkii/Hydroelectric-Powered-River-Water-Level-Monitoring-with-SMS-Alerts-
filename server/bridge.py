import sqlite3
import json
import paho.mqtt.client as mqtt

MQTT_TOPIC = "sensor/hulo/reading"
STATUS_TOPIC = "system/status"
MQTT_SERVER = "127.0.0.1" 
MQTT_PORT = 1883
DB_PATH = "river_monitor.db"

def broadcast_status(client):
    """Helper function to send the status to the dashboard"""
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
    print("📡 Status broadcast sent to Dashboard.")

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        
        # 1. Save to Database
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO readings (date, time, distance, range, predicted) 
                   VALUES (?, ?, ?, ?, ?)""",
                (data['date'], data['time'], data['distance'], data['range'], data['predicted'])
            )
            conn.commit()
        
        print(f"Logged: {data['time']} | {data['distance']} | {data['range']}")

        # 2. Update Dashboard status every time a message arrives
        broadcast_status(client)
        
    except Exception as e:
        print(f"Error processing message: {e}")

# Setup MQTT Client
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_message = on_message

try:
    client.connect(MQTT_SERVER, MQTT_PORT)
    client.subscribe(MQTT_TOPIC)
    print(f"Bridge active. Listening on '{MQTT_TOPIC}'...")
    
    # 3. Send an initial status so the dashboard lights up immediately
    broadcast_status(client)
    
    client.loop_forever()
except Exception as e:
    print(f"Connection failed: {e}")