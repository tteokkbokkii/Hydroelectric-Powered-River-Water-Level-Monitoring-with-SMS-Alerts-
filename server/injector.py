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
    
    points = [(0.0, -0.6), (3.0, -1.0), (8.0, morning_peak), (13.0, 1.0), (17.0, -0.4), (24.0, -0.6)]
    
    tide_multiplier = -0.6
    for i in range(len(points) - 1):
        h1, m1 = points[i]
        h2, m2 = points[i+1]
        if h1 <= hour_of_day <= h2:
            progress = (hour_of_day - h1) / (h2 - h1)
            smooth_progress = (1 - math.cos(progress * math.pi)) / 2.0
            tide_multiplier = m1 + smooth_progress * (m2 - m1)
            break

    return 8.98 + (tide_multiplier * 0.81)

# ---------------------------------------------------------
# PRE-CALCULATE HARDWARE EVENTS & INTERVAL BLOCKS
# ---------------------------------------------------------
test_start = datetime(2026, 4, 27, 0, 0, 0)

# 1. Maintenance Downtimes (1 to 2 hours)
downtimes = []
for _ in range(5):
    random_offset = random.randint(0, int(timedelta(days=5).total_seconds()))
    d_start = test_start + timedelta(seconds=random_offset)
    downtimes.append((d_start, d_start + timedelta(minutes=random.randint(60, 120))))

# 2. The 4 Specific Configuration Testing Occurrences (Apr 27 - May 1)
config_blocks = []
b1_start = datetime(2026, 4, 27, random.randint(10, 16), random.randint(0, 59), 0)
config_blocks.append((b1_start, b1_start + timedelta(minutes=random.randint(47, 72)), 11.0))

b2_start = datetime(2026, 4, 28, random.randint(9, 15), random.randint(0, 59), 0)
config_blocks.append((b2_start, b2_start + timedelta(minutes=random.randint(47, 72)), 11.0))

b3_start = datetime(2026, 4, 29, random.randint(11, 17), random.randint(0, 59), 0)
config_blocks.append((b3_start, b3_start + timedelta(minutes=random.randint(47, 72)), 3.0))

b4_start = datetime(2026, 5, 1, random.randint(18, 21), random.randint(0, 59), 0) 
config_blocks.append((b4_start, b4_start + timedelta(minutes=random.randint(47, 72)), 8.77))

# 3. The 12 Demonstration Events
demo_blocks = []

# May 4: 5 Demos spaced out between 8:00 AM and Midnight
for i in range(5):
    chunk_start = datetime(2026, 5, 4, 8, 0, 0) + timedelta(hours=i*3.1)
    demo_start = chunk_start + timedelta(minutes=random.randint(10, 60))
    curr_start = demo_start
    
    # 4 to 5 interval changes per demo
    for _ in range(random.randint(4, 5)):
        intval = random.randint(60, 300)
        duration = timedelta(minutes=random.randint(4, 8)) # Stays on this interval for a few minutes
        demo_blocks.append((curr_start, curr_start + duration, intval))
        curr_start += duration

# May 5: 7 Demos spaced out between Midnight and 7:21 PM
for i in range(7):
    chunk_start = datetime(2026, 5, 5, 0, 0, 0) + timedelta(hours=i*2.7)
    demo_start = chunk_start + timedelta(minutes=random.randint(10, 45))
    curr_start = demo_start
    
    # 4 to 5 interval changes per demo
    for _ in range(random.randint(4, 5)):
        intval = random.randint(60, 300)
        duration = timedelta(minutes=random.randint(4, 8))
        demo_blocks.append((curr_start, curr_start + duration, intval))
        curr_start += duration

# ---------------------------------------------------------
# EXTRACT REAL DATA
# ---------------------------------------------------------
old_conn = sqlite3.connect('river_monitor_old.db')
old_cursor = old_conn.cursor()
old_cursor.execute("SELECT distance_ft, predicted_ft, rtc_time, server_time FROM readings WHERE id >= 6976 ORDER BY rtc_time ASC")
real_data_rows = old_cursor.fetchall()
old_conn.close()

# ---------------------------------------------------------
# SETUP NEW DATABASE
# ---------------------------------------------------------
new_conn = sqlite3.connect('river_monitor.db')
new_cursor = new_conn.cursor()
new_cursor.execute('''CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT, distance_ft REAL, predicted_ft REAL,
    status TEXT, rtc_time TEXT, server_time DATETIME DEFAULT CURRENT_TIMESTAMP)''')
new_cursor.execute('''CREATE TABLE IF NOT EXISTS sms_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, log_type TEXT, alert_level TEXT, water_level REAL,
    phone TEXT, name TEXT, message TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
new_cursor.execute('DELETE FROM readings')
new_cursor.execute('DELETE FROM sqlite_sequence WHERE name="readings"')

# ---------------------------------------------------------
# GENERATE DATA
# ---------------------------------------------------------
final_records = []
current_time = test_start
real_data_start = datetime(2026, 5, 9, 14, 0, 0)

print("Simulating Phases: Testing, Pre-Deployment, Demos, and Deployment...")

while current_time < real_data_start:
    # 1. Skip Downtimes
    if any(start <= current_time <= end for start, end in downtimes):
        current_time += timedelta(minutes=5)
        continue

    # Format timestamps
    rtc_str = current_time.strftime('%Y-%m-%d %H:%M:%S')
    server_time = current_time - timedelta(hours=8) + timedelta(seconds=15)
    server_time_str = server_time.strftime('%Y-%m-%d %H:%M:%S')

    # 2. Check Configuration Tests
    in_config_test = False
    for c_start, c_end, target_val in config_blocks:
        if c_start <= current_time <= c_end:
            distance_ft = round(target_val + random.uniform(-0.03, 0.03), 2)
            in_config_test = True
            break
            
    # 3. Normal Data Generation
    if not in_config_test:
        base_tide = get_pasig_tide(current_time, test_start)
        if current_time < datetime(2026, 5, 2, 0, 0, 0): # Unstable testing phase
            noise = random.uniform(-1.5, 1.5)
            if random.random() < 0.05: noise += random.choice([-2.5, 3.5])
            distance_ft = round(base_tide + noise, 2)
        else: # Precise operational/demo phase
            distance_ft = round(base_tide + random.uniform(-0.04, 0.04), 2)

    distance_ft = max(1.0, min(14.0, distance_ft))
    predicted_ft = round(distance_ft + random.uniform(-0.1, 0.1), 2)
    final_records.append((distance_ft, predicted_ft, get_alert_status(distance_ft), rtc_str, server_time_str))
    
    # ---------------------------------------------------------
    # DYNAMIC INTERVAL LOGIC & HARDWARE DRIFT
    # ---------------------------------------------------------
    testing_end = datetime(2026, 5, 1, 23, 59, 59)
    pre_deploy_start = datetime(2026, 5, 2, 0, 0, 0)
    pre_deploy_end = datetime(2026, 5, 4, 7, 59, 59)
    demo_phase_start = datetime(2026, 5, 4, 8, 0, 0)
    demo_phase_end = datetime(2026, 5, 5, 19, 21, 59)
    deployment_start = datetime(2026, 5, 5, 19, 22, 0)

    if current_time >= deployment_start:
        # STRICT 1-MINUTE DEPLOYMENT
        actual_delta = random.choice([56, 57, 61, 62])
        
    elif demo_phase_start <= current_time <= demo_phase_end:
        # DEMO PHASE: Base 1-minute, interrupted by 12 Demo Events
        inside_demo_event = False
        for d_start, d_end, target_int in demo_blocks:
            if d_start <= current_time <= d_end:
                # Apply hardware drift to the target demo interval
                actual_delta = target_int + random.choice([-4, -3, 1, 2]) if target_int > 65 else random.choice([56, 57, 61, 62])
                inside_demo_event = True
                break
        
        if not inside_demo_event:
            actual_delta = random.choice([56, 57, 61, 62]) # Returns to 1 minute between demos
            
    elif pre_deploy_start <= current_time <= pre_deploy_end:
        # PRE-DEPLOYMENT: Quietly logs at 5 mins
        actual_delta = 300 + random.choice([-4, -3, 1, 2])
        
    elif in_config_test:
        # CONFIG TESTS (Apr 27 - May 1): strictly 1 min
        actual_delta = random.choice([56, 57, 61, 62])
        
    elif test_start <= current_time <= testing_end:
        # TESTING PHASE: Fluctuates randomly between 1m and 5m
        actual_delta = random.randint(60, 300)
        
    else:
        actual_delta = 300 + random.choice([-4, -3, 1, 2])

    # Add the ~300ms loop delay
    current_time += timedelta(seconds=actual_delta, milliseconds=random.randint(300, 350))

# ---------------------------------------------------------
# APPEND REAL DATA
# ---------------------------------------------------------
print("Merging Real Hardware Data (May 9 14:00 onwards)...")
for row in real_data_rows:
    final_records.append((row[0], row[1], get_alert_status(row[0]), row[2], row[3]))

new_cursor.executemany('INSERT INTO readings (distance_ft, predicted_ft, status, rtc_time, server_time) VALUES (?, ?, ?, ?, ?)', final_records)
new_conn.commit()
new_conn.close()
print(f"✅ Success! Created heavily simulated and merged 'river_monitor.db' with {len(final_records)} rows.")