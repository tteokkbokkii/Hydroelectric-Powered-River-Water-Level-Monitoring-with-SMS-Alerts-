import sqlite3

def init_db():
    conn = sqlite3.connect("river_monitor.db")
    cursor = conn.cursor()
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
    conn.commit()
    conn.close()
    print("✅ Database initialized with unified schema.")

if __name__ == "__main__":
    init_db()