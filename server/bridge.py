import sqlite3
import json
import paho.mqtt.client as mqtt
import time
import threading
import subprocess
import re
import os

# Configuration
MQTT_TOPIC = "sensor/hulo/reading"
STATUS_TOPIC = "system/status"
SETTINGS_TOPIC = "system/settings"
SETTINGS_UPDATE_TOPIC = "system/settings/update"
CONTACTS_UPDATE_TOPIC = "contacts/update"
CONTACTS_LIST_TOPIC = "contacts/list"
SMS_COMMAND_TOPIC = "sms/command" 
SMS_LOG_TOPIC = "sms/log"
MQTT_SERVER = "127.0.0.1"
DB_PATH = "/home/admin/thesis/server/river_monitor.db"
SETTINGS_FILE = "settings.json"
CONTACTS_FILE = "contacts.json"

# Global state
last_esp_contact = 0
START_TIME = time.time()
esp32_health = {"online": False, "ultrasonic": "OK", "float": "OK"}

def get_settings():
    try:
        with open(SETTINGS_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {
            "threshold_normal": 16.0,
            "threshold_attention": 20.0,
            "threshold_critical": 22.0,
            "reading_interval": 5,
            "predicting_interval": 60
        }

def publish_settings(client):
    settings = get_settings()
    client.publish(SETTINGS_TOPIC, json.dumps(settings), retain=True)
    print("Published settings to MQTT (Retained)")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Existing readings table
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
    # ADDED: Ensure sms_logs table exists just in case
    c.execute("""
        CREATE TABLE IF NOT EXISTS sms_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            log_type TEXT,
            alert_level TEXT,
            water_level REAL,
            recipient_name TEXT,
            recipient_phone TEXT,
            message TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
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
    global last_esp_contact, esp32_health
    
    current_settings = get_settings()
    interval_minutes = current_settings.get("reading_interval", 5)
    timeout_seconds = (interval_minutes * 60) + 60 
    is_alive = (time.time() - last_esp_contact) < timeout_seconds
    
    status_payload = {
        "uptime": get_uptime_string(),
        "signal_quality": get_wifi_rssi(),
        "network_type": "WIFI",
        "rpi_online": True,
        "esp_connected": is_alive,
        "ultrasonic_active": is_alive and esp32_health.get("ultrasonic") == "OK",
        "float_ready": is_alive and esp32_health.get("float") == "OK",
        "rtc_synced": is_alive,
        "gsm_status": "READY"
    }
    client.publish(STATUS_TOPIC, json.dumps(status_payload), retain=True)

def publish_contacts(client):
    try:
        with open(CONTACTS_FILE, 'r') as f:
            contacts = json.load(f)
            client.publish(CONTACTS_LIST_TOPIC, json.dumps(contacts), retain=True)
    except FileNotFoundError:
        pass 

def heartbeat_loop(client):
    # Publish initial states ONCE when the script starts
    publish_settings(client)
    publish_contacts(client)
    
    while True:
        broadcast_status(client)
        time.sleep(2)

def on_message(client, userdata, msg):
    global last_esp_contact, esp32_health
    if msg.topic == MQTT_TOPIC:
        last_esp_contact = time.time()
        try:
            data = json.loads(msg.payload.decode())
            
            distance_ft = data.get("distance")
            if distance_ft is None:
                distance_ft = data.get("elevation")
            
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
            print(f"Error processing sensor message: {e}")
            
    elif msg.topic == CONTACTS_UPDATE_TOPIC:
        try:
            contacts = json.loads(msg.payload.decode())
            with open(CONTACTS_FILE, 'w') as f:
                json.dump(contacts, f, indent=2)
            client.publish(CONTACTS_LIST_TOPIC, json.dumps(contacts), retain=True)
            print("Contacts updated and saved")
        except Exception as e:
            print(f"Error saving contacts: {e}")
            
    elif msg.topic == SETTINGS_UPDATE_TOPIC:
        try:
            settings = json.loads(msg.payload.decode())
            # 1. Save the new settings to the SD card
            with open(SETTINGS_FILE, 'w') as f:
                json.dump(settings, f, indent=2)
            # 2. Immediately broadcast the new settings to the rest of the system
            client.publish(SETTINGS_TOPIC, json.dumps(settings), retain=True)
            print("⚙️ Settings updated and saved via MQTT")
        except Exception as e:
            print(f"Error saving settings: {e}")

    elif msg.topic == "system/status/esp32":
        last_esp_contact = time.time() 
        try:
            data = json.loads(msg.payload.decode())
            esp32_health["online"] = data.get("online", False)
            esp32_health["ultrasonic"] = data.get("ultrasonic", "OK")
            esp32_health["float"] = data.get("float", "OK")
        except Exception as e:
            print(f"Error parsing ESP32 status: {e}")

    # --- ADDED: Intercept manual SMS tests and log to DB ---
    elif msg.topic == SMS_COMMAND_TOPIC:
        try:
            data = json.loads(msg.payload.decode())
            recipient_phone = data.get("phone", "Unknown")
            recipient_name = data.get("name", "Unknown Contact")
            message = data.get("message", "Test Message")
            
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("""
                INSERT INTO sms_logs (log_type, recipient_name, recipient_phone, message)
                VALUES (?, ?, ?, ?)
            """, ("TEST", recipient_name, recipient_phone, message))
            conn.commit()
            conn.close()
            print(f"📝 Logged TEST SMS to database for {recipient_name} ({recipient_phone})")
        except Exception as e:
            print(f"Error logging SMS: {e}")
            
    # --- Intercept ACTUAL ESP32 Alerts and log to DB ---
    elif msg.topic == SMS_LOG_TOPIC:
        try:
            data = json.loads(msg.payload.decode())
            
            # Extract data sent by ESP32 (fallback to defaults if missing)
            log_type = data.get("type", "ALERT")
            alert_level = data.get("level", "UNKNOWN")
            water_level = data.get("water_level", 0.0)
            recipient_phone = data.get("phone", "Unknown")
            recipient_name = data.get("name", "Unknown Contact")
            message = data.get("message", "Alert message sent")
            
            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute("""
                INSERT INTO sms_logs (log_type, alert_level, water_level, recipient_name, recipient_phone, message)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (log_type, alert_level, water_level, recipient_name, recipient_phone, message))
            conn.commit()
            conn.close()
            print(f"🚨 Logged ALERT SMS for {recipient_name} at level {alert_level}")
        except Exception as e:
            print(f"Error logging ALERT SMS: {e}")

# 1. Define the V2 on_connect callback
def on_connect(client, userdata, flags, reason_code, properties):
    if reason_code == 0:
        print("Connected to broker! Subscribing to topics...")
        client.subscribe(MQTT_TOPIC)
        client.subscribe("system/status/esp32")
        client.subscribe(CONTACTS_UPDATE_TOPIC)
        client.subscribe(SETTINGS_UPDATE_TOPIC)
        client.subscribe(SMS_COMMAND_TOPIC) 
        client.subscribe(SMS_LOG_TOPIC)
    else:
        print(f"Failed to connect. Code: {reason_code}")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_connect = on_connect  # 2. Attach the callback
client.on_message = on_message
client.will_set(STATUS_TOPIC, json.dumps({"esp_connected": False}), retain=True)

try:
    client.connect(MQTT_SERVER, 1883)
    
    try:
        with open(CONTACTS_FILE, 'r') as f:
            contacts = json.load(f)
            client.publish(CONTACTS_LIST_TOPIC, json.dumps(contacts), retain=True)
    except FileNotFoundError:
        default_contacts = [
            {"id": 1, "name": "John Doe", "phone": "+639123456789", "alertLevel": "ALL"},
            {"id": 2, "name": "Jane Smith", "phone": "+639987654321", "alertLevel": "WARNING"},
            {"id": 3, "name": "Emergency Contact", "phone": "+639112233445", "alertLevel": "CRITICAL"}
        ]
        with open(CONTACTS_FILE, 'w') as f:
            json.dump(default_contacts, f, indent=2)
        client.publish(CONTACTS_LIST_TOPIC, json.dumps(default_contacts), retain=True)
        print("Created default contacts")
        
    threading.Thread(target=heartbeat_loop, args=(client,), daemon=True).start()
    print("Bridge active. Monitoring ESP32 and System Health...")
    client.loop_forever()
except Exception as e:
    print(f"Connection failed: {e}")