import sqlite3

def init_db():
    conn = sqlite3.connect("river_monitor.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            distance_ft REAL,
            predicted_ft REAL,
            status TEXT,
            f_safe INTEGER,
            f_warn INTEGER,
            f_crit INTEGER,
            rtc_time TEXT,
            server_time DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()
    print("✅ Schema Ready with RTC support.")