import sqlite3
import math
import random
from datetime import datetime, timedelta

def get_alert_status(elevation_ft):
    """Applies your new strict thresholds to the status column"""
    if elevation_ft >= 9.0:
        return "CRITICAL"
    elif elevation_ft >= 8.0:
        return "WARNING"
    else:
        return "SAFE"

def get_pasig_tide(current_time, start_time):
    """
    Pasig River Estuary Math, calibrated to your actual data (8.17ft to 9.79ft).
    Midpoint ~8.98ft, Amplitude ~0.81ft.
    """
    hour_of_day = current_time.hour + (current_time.minute / 60.0)
    days_elapsed = (current_time - start_time).total_seconds() / 86400.0

    # 14-day lunar neap/spring cycle affecting morning secondary tide
    morning_peak = 0.4 + (0.4 * math.cos(days_elapsed * math.pi / 7.0)) 
    
    points = [
        (0.0, -0.6),
        (3.0, -1.0),         # Lowest around 3 AM
        (8.0, morning_peak), # Morning bump
        (13.0, 1.0),         # Highest around 1 PM
        (17.0, -0.4),        # Late afternoon drop
        (24.0, -0.6)
    ]
    
    tide_multiplier = -0.6
    for i in range(len(points) - 1):
        h1, m1 = points[i]
        h2, m2 = points[i+1]
        if h1 <= hour_of_day <= h2:
            progress = (hour_of_day - h1) / (h2 - h1)
            smooth_progress = (1 - math.cos(progress * math.pi)) / 2.0
            tide_multiplier = m1 + smooth_progress * (m2 - m1)
            break

    # Apply real-world calibration bounds observed in your DB
    midpoint = 8.98
    amplitude = 0.81
    
    return midpoint + (tide_multiplier * amplitude)

# ---------------------------------------------------------
# 1. READ REAL DATA FROM OLD DATABASE
# ---------------------------------------------------------
old_conn = sqlite3.connect('river_monitor_old.db')
old_cursor = old_conn.cursor()

# Fetch real data starting from ID 6976 (May 9 14:00 onwards)
old_cursor.execute("""
    SELECT distance_ft, predicted_ft, rtc_time, server_time 
    FROM readings 
    WHERE id >= 6976 
    ORDER BY rtc_time ASC
""")
real_data_rows = old_cursor.fetchall()
old_conn.close()

# ---------------------------------------------------------
# 2. SETUP NEW DATABASE EXACTLY MATCHING YOUR SCHEMA
# ---------------------------------------------------------
new_conn = sqlite3.connect('river_monitor.db')
new_cursor = new_conn.cursor()

# Exact schema of your uploaded .db
new_cursor.execute('''
    CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        distance_ft REAL,
        predicted_ft REAL,
        status TEXT,
        rtc_time TEXT,
        server_time DATETIME DEFAULT CURRENT_TIMESTAMP
    )
''')
# Create sms_logs table just to keep the schema identical
new_cursor.execute('''
    CREATE TABLE IF NOT EXISTS sms_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_type TEXT,
        alert_level TEXT,
        water_level REAL,
        phone TEXT,
        name TEXT,
        message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
''')
new_cursor.execute('DELETE FROM readings')
new_cursor.execute('DELETE FROM sqlite_sequence WHERE name="readings"')

# ---------------------------------------------------------
# 3. GENERATE ALL DATA
# ---------------------------------------------------------
final_records = []
current_time = datetime(2026, 4, 28, 0, 0, 0)
real_data_start = datetime(2026, 5, 9, 14, 0, 0)
interval = timedelta(minutes=5)

print("Phase 1: Generating Unstable Testing Data (Apr 28 - May 1)...")
print("Phase 2: Generating Calibrated Tide Data (May 2 - May 9 13:55)...")

while current_time < real_data_start:
    rtc_time_str = current_time.strftime('%Y-%m-%d %H:%M:%S')
    
    # Simulate server receiving it 8 hours behind (matching your old DB's timezone offset)
    server_time = current_time - timedelta(hours=8)
    server_time_str = server_time.strftime('%Y-%m-%d %H:%M:%S')

    base_tide = get_pasig_tide(current_time, datetime(2026, 4, 28, 0, 0, 0))

    if current_time < datetime(2026, 5, 2, 0, 0, 0):
        # PHASE 1: UNSTABLE TESTING DATA
        # Add massive noise and random spikes
        noise = random.uniform(-1.5, 1.5)
        if random.random() < 0.05: # 5% chance of a severe glitch spike/drop
            noise += random.choice([-2.5, 3.5])
        
        distance_ft = round(base_tide + noise, 2)
    else:
        # PHASE 2: PRECISE TIDE DATA
        # Minor, realistic water ripples mimicking real sensor
        noise = random.uniform(-0.04, 0.04)
        distance_ft = round(base_tide + noise, 2)

    # Cap physical bounds so it doesn't break math
    distance_ft = max(1.0, min(14.0, distance_ft))
    
    # Predict is usually close to current reading
    predicted_ft = round(distance_ft + random.uniform(-0.1, 0.1), 2)
    
    status = get_alert_status(distance_ft)
    
    final_records.append((distance_ft, predicted_ft, status, rtc_time_str, server_time_str))
    current_time += interval

# ---------------------------------------------------------
# 4. APPEND REAL DATA WITH NEW THRESHOLDS
# ---------------------------------------------------------
print("Phase 3: Merging Real Data and Re-calculating Alerts (May 9 14:00+)...")

for row in real_data_rows:
    real_distance_ft = row[0]
    real_predicted_ft = row[1]
    rtc_time_str = row[2]
    server_time_str = row[3]
    
    # Apply your new strict rules to the real data
    new_status = get_alert_status(real_distance_ft)
    
    final_records.append((real_distance_ft, real_predicted_ft, new_status, rtc_time_str, server_time_str))

# ---------------------------------------------------------
# 5. BATCH INSERT AND SAVE
# ---------------------------------------------------------
new_cursor.executemany('''
    INSERT INTO readings (distance_ft, predicted_ft, status, rtc_time, server_time) 
    VALUES (?, ?, ?, ?, ?)
''', final_records)

new_conn.commit()
new_conn.close()

print(f"✅ Success! Inserted {len(final_records)} total rows into the new 'river_monitor.db'.")