from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import json

app = Flask(__name__)
CORS(app)

DB_PATH = 'river_monitor.db'
SETTINGS_FILE = 'settings.json'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ---- Readings endpoints ----
@app.route('/api/data', methods=['GET'])
def get_recent_logs():
    """Return last 50 readings, ordered by server_time DESC"""
    try:
        conn = get_db_connection()
        query = "SELECT id, distance_ft, predicted_ft, status, rtc_time, server_time FROM readings ORDER BY server_time DESC LIMIT 50"
        rows = conn.execute(query).fetchall()
        conn.close()
        results = []
        for row in rows:
            # Parse rtc_time (format "YYYY-MM-DD HH:MM:SS") into separate date and time
            rtc_parts = row['rtc_time'].split() if row['rtc_time'] else ["", ""]
            date = rtc_parts[0] if len(rtc_parts) > 0 else ""
            time = rtc_parts[1] if len(rtc_parts) > 1 else ""
            results.append({
                "id": row['id'],
                "date": date,
                "time": time,
                "distance": row['distance_ft'],
                "predicted": row['predicted_ft'],
                "range": row['status']
            })
        return jsonify(results)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    """Return all readings for a given date (YYYY-MM-DD) based on rtc_time date"""
    selected_date = request.args.get('date')
    if not selected_date:
        return jsonify({"error": "Date parameter required"}), 400
    try:
        conn = get_db_connection()
        # Filter by date part of rtc_time (stored as "YYYY-MM-DD HH:MM:SS")
        query = "SELECT id, distance_ft, predicted_ft, status, rtc_time FROM readings WHERE rtc_time LIKE ? ORDER BY rtc_time ASC"
        rows = conn.execute(query, (f"{selected_date}%",)).fetchall()
        conn.close()
        results = []
        for row in rows:
            rtc_parts = row['rtc_time'].split()
            date = rtc_parts[0] if len(rtc_parts) > 0 else ""
            time = rtc_parts[1] if len(rtc_parts) > 1 else ""
            results.append({
                "id": row['id'],
                "date": date,
                "time": time,
                "distance": row['distance_ft'],
                "predicted": row['predicted_ft'],
                "range": row['status']
            })
        return jsonify(results)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ---- Settings endpoints ----
@app.route('/api/settings', methods=['GET', 'POST'])
def settings():
    if request.method == 'GET':
        try:
            with open(SETTINGS_FILE, 'r') as f:
                return jsonify(json.load(f))
        except FileNotFoundError:
            return jsonify({
                "threshold_normal": 6.5,
                "threshold_attention": 8.0,
                "threshold_critical": 9.5,
                "reading_interval": 5,
                "predicting_interval": 60
            })
    if request.method == 'POST':
        data = request.json
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(data, f)
        print(f"✅ Settings saved: {data}")
        return jsonify({"status": "success"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)