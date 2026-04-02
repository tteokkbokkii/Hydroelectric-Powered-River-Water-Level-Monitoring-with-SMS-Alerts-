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
SETTINGS_TOPIC = "system/settings"
MQTT_SERVER = "127.0.0.1"
DB_PATH = "river_monitor.db"
SETTINGS_FILE = "settings.json"

# Global state
last_esp_contact = 0
START_TIME = time.time()

def get_settings():
    try:
        with open(SETTINGS_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {
            "threshold_normal": 6.5,
            "threshold_attention": 8.0,
            "threshold_critical": 9.5,
            "reading_interval": 5,
            "predicting_interval": 60
        }

def publish_settings(client):
    settings = get_settings()
    client.publish(SETTINGS_TOPIC, json.dumps(settings))
    print("Published settings to MQTT")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            distance_ft REAL,
            predicted_ft REAL,
            status TEXT,
            rtc_time TEXT,
            server_time DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

def get_wifi_rssi():
    try:
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
    esp_online = (time.time() - last_esp_contact) < 30
    status_payload = {
        "uptime": get_uptime_string(),
        "signal_quality": get_wifi_rssi(),
        "network_type": "WIFI",
        "rpi_online": True,
        "esp_connected": esp_online,
        "ultrasonic_active": esp_online,
        "float_ready": True,
        "rtc_synced": True,
        "gsm_status": "READY"
    }
    client.publish(STATUS_TOPIC, json.dumps(status_payload))

def heartbeat_loop(client):
    while True:
        broadcast_status(client)
        publish_settings(client)
        time.sleep(30)

def on_message(client, userdata, msg):
    global last_esp_contact
    if msg.topic == MQTT_TOPIC:
        last_esp_contact = time.time()
        try:
            data = json.loads(msg.payload.decode())
            print(f"Inserting: {data}")   # debug
            distance_ft = data.get("distance")
            predicted_ft = data.get("predicted")
            status = data.get("range")
            rtc_time = f"{data.get('date')} {data.get('time')}"
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute('''
                INSERT INTO readings (distance_ft, predicted_ft, status, rtc_time)
                VALUES (?, ?, ?, ?)
            ''', (distance_ft, predicted_ft, status, rtc_time))
            conn.commit()
            conn.close()
            print(f"Inserted: {distance_ft} ft, status {status}, time {rtc_time}")
        except Exception as e:
            print(f"Error processing message: {e}")

# Use the new callback API version
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_message = on_message

try:
    client.connect(MQTT_SERVER, 1883)
    client.subscribe(MQTT_TOPIC)
    threading.Thread(target=heartbeat_loop, args=(client,), daemon=True).start()
    print("Bridge active. Monitoring ESP32 and System Health...")
    client.loop_forever()
except Exception as e:
    print(f"Connection failed: {e}")