import sqlite3
import math
import random
from datetime import datetime, timedelta

def get_alert_status(elevation_ft):
    if elevation_ft >= 9.0:
        return "CRITICAL"
    elif elevation_ft >= 8.0:
        return "WARNING"
    else:
        return "SAFE"

def get_pasig_tide(current_time, start_time):
    hour_of_day = current_time.hour + (current_time.minute / 60.0)
    days_elapsed = (current_time - start_time).total_seconds() / 86400.0
    morning_peak = 0.4 + (0.4 * math.cos(days_elapsed * math.pi / 7.0)) 
    
    points = [
        (0.0, -0.6), (3.0, -1.0), (8.0, morning_peak), 
        (13.0, 1.0), (17.0, -0.4), (24.0, -0.6)
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

    # Real-world calibration bounds (8.17ft to 9.79ft)
    return 8.98 + (tide_multiplier * 0.81)

# ---------------------------------------------------------
# PRE-CALCULATE HARDWARE TESTING EVENTS
# ---------------------------------------------------------
test_start = datetime(2026, 4, 27, 0, 0, 0)

# 1. Generate 5 random Downtimes (1 to 2 hours) between Apr 27 and May 2
downtimes = []
for _ in range(5):
    random_offset = random.randint(0, int(timedelta(days=5).total_seconds()))
    down_start = test_start + timedelta(seconds=random_offset)
    down_end = down_start + timedelta(minutes=random.randint(60, 120))
    downtimes.append((down_start, down_end))

# 2. Generate 6 random Calibration blocks (31 to 48 mins) between Apr 27 and May 1
calibrations = []
for _ in range(6):
    random_offset = random.randint(0, int(timedelta(days=4).total_seconds()))
    cal_start = test_start + timedelta(seconds=random_offset)
    cal_end = cal_start + timedelta(minutes=random.randint(31, 48))
    
    # Decide if we are testing the SAFE float (low water) or CRITICAL float (high water)
    cal_fixed_val = random.uniform(2.0, 4.0) if random.choice([True, False]) else random.uniform(11.0, 13.0)
    calibrations.append((cal_start, cal_end, cal_fixed_val))

# ---------------------------------------------------------
# EXTRACT REAL DATA
# ---------------------------------------------------------
old_conn = sqlite3.connect('river_monitor_old.db')
old_cursor = old_conn.cursor()
old_cursor.execute("""
    SELECT distance_ft, predicted_ft, rtc_time, server_time 
    FROM readings 
    WHERE id >= 6976 ORDER BY rtc_time ASC
""")
real_data_rows = old_cursor.fetchall()
old_conn.close()

# ---------------------------------------------------------
# SETUP NEW DATABASE
# ---------------------------------------------------------
new_conn = sqlite3.connect('river_monitor.db')
new_cursor = new_conn.cursor()
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
new_cursor.execute('''
    CREATE TABLE IF NOT EXISTS sms_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_type TEXT, alert_level TEXT, water_level REAL,
        phone TEXT, name TEXT, message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
''')
new_cursor.execute('DELETE FROM readings')
new_cursor.execute('DELETE FROM sqlite_sequence WHERE name="readings"')

# ---------------------------------------------------------
# GENERATE DATA
# ---------------------------------------------------------
final_records = []
current_time = datetime(2026, 4, 27, 0, 0, 0)
real_data_start = datetime(2026, 5, 9, 14, 0, 0)

print("Simulating Hardware Downtimes, Calibrations, and Millisecond Drifts...")

while current_time < real_data_start:
    # 1. Is the system turned off?
    if any(start <= current_time <= end for start, end in downtimes):
        # Skip this cycle (System is offline)
        current_time += timedelta(minutes=5) + timedelta(milliseconds=random.randint(3, 5))
        continue

    # 2. Add realistic milliseconds to timestamps
    rtc_str = current_time.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
    
    # Replicate your actual network latency (8 hrs timezone offset + ~15s MQTT latency + ms latency)
    server_time = current_time - timedelta(hours=8) + timedelta(seconds=15, milliseconds=random.randint(3, 5))
    server_time_str = server_time.strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]

    # 3. Is the system being calibrated?
    in_calibration = False
    for c_start, c_end, c_fixed_val in calibrations:
        if c_start <= current_time <= c_end:
            # Consistent artificial readings held by a human
            distance_ft = round(c_fixed_val + random.uniform(-0.02, 0.02), 2)
            in_calibration = True
            break
            
    # 4. Normal testing/tide logic
    if not in_calibration:
        base_tide = get_pasig_tide(current_time, datetime(2026, 4, 27, 0, 0, 0))
        if current_time < datetime(2026, 5, 2, 0, 0, 0):
            # Unstable testing period
            noise = random.uniform(-1.5, 1.5)
            if random.random() < 0.05: noise += random.choice([-2.5, 3.5])
            distance_ft = round(base_tide + noise, 2)
        else:
            # Precise operational period
            distance_ft = round(base_tide + random.uniform(-0.04, 0.04), 2)

    distance_ft = max(1.0, min(14.0, distance_ft))
    predicted_ft = round(distance_ft + random.uniform(-0.1, 0.1), 2)
    status = get_alert_status(distance_ft)
    
    final_records.append((distance_ft, predicted_ft, status, rtc_str, server_time_str))
    
    # ESP32 Timer Drift: 5 minutes + 3-5ms delay between readings
    current_time += timedelta(minutes=5) + timedelta(milliseconds=random.randint(3, 5))

# ---------------------------------------------------------
# APPEND REAL DATA
# ---------------------------------------------------------
print("Merging Real Data...")
for row in real_data_rows:
    new_status = get_alert_status(row[0])
    final_records.append((row[0], row[1], new_status, row[2], row[3]))

# Insert and Save
new_cursor.executemany('''
    INSERT INTO readings (distance_ft, predicted_ft, status, rtc_time, server_time) 
    VALUES (?, ?, ?, ?, ?)
''', final_records)

new_conn.commit()
new_conn.close()

print(f"✅ Success! Created heavily simulated and merged 'river_monitor.db' with {len(final_records)} rows.")