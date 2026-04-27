import sqlite3

def init_db():
    conn = sqlite3.connect("river_monitor.db")
    cursor = conn.cursor()
    
    # Existing readings table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            distance_ft REAL,
            predicted_ft REAL,
            status TEXT,               -- SAFE, WARNING, CRITICAL
            rtc_time TEXT,             -- from ESP32 RTC (YYYY-MM-DD HH:MM:SS)
            server_time DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # NEW: SMS Logs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sms_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            log_type TEXT,             -- 'MANUAL' or 'ALERT'
            alert_level TEXT,          -- 'WARNING', 'CRITICAL', etc. (NULL if manual)
            water_level REAL,          -- Water level at time of sending (NULL if manual)
            recipient_name TEXT,
            recipient_phone TEXT,
            message TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()
    print("✅ Database initialized with readings and sms_logs tables.")

if __name__ == "__main__":
    init_db()