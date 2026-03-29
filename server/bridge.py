import sqlite3
import json
import paho.mqtt.client as mqtt

MQTT_TOPIC = "sensor/hulo/reading"
MQTT_SERVER = "127.0.0.1" 
MQTT_PORT = 1883
DB_PATH = "river_monitor.db"

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO readings (date, time, distance, range, predicted) 
                   VALUES (?, ?, ?, ?, ?)""",
                (data['date'], data['time'], data['distance'], data['range'], data['predicted'])
            )
            conn.commit()
        print(f"Logged: {data['time']} | {data['distance']} | {data['range']}")
        
    except Exception as e:
        print(f"Error processing message: {e}")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_message = on_message

try:
    client.connect(MQTT_SERVER, MQTT_PORT)
    client.subscribe(MQTT_TOPIC)
    print(f"Bridge active. Listening on '{MQTT_TOPIC}'...")
    client.loop_forever()
except Exception as e:
    print(f"Connection failed: {e}")