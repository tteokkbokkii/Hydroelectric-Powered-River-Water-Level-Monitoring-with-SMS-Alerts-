import sqlite3

def init_db():
    conn = sqlite3.connect("river_monitor.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            time TEXT,
            distance REAL,
            range TEXT,
            predicted REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()
    print("Database initialized: river_monitor.db")

if __name__ == "__main__":
    init_db()