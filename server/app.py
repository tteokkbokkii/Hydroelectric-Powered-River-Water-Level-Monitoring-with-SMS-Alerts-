from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import json
import traceback # Crucial for your "Analyzability" audit

app = Flask(__name__)
CORS(app)

DB_PATH = 'river_monitor.db'
SETTINGS_FILE = 'settings.json'

def get_db_connection():
    # TEST: Change 'river_monitor.db' to 'wrong.db' here to trigger the error
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/data', methods=['GET'])
def get_recent_logs():
    try:
        # --- ANALYZABILITY TRIGGER ---
        # If you want to force a line-number error now, uncomment the line below:
        # raise ValueError("Manual Audit Trigger") 
        
        conn = get_db_connection()
        query = "SELECT id, distance_ft, predicted_ft, status, rtc_time, server_time FROM readings ORDER BY server_time DESC LIMIT 50"
        rows = conn.execute(query).fetchall()
        conn.close()
        
        results = []
        for row in rows:
            rtc_parts = row['rtc_time'].split() if row['rtc_time'] else ["", ""]
            results.append({
                "id": row['id'],
                "date": rtc_parts[0] if len(rtc_parts) > 0 else "",
                "time": rtc_parts[1] if len(rtc_parts) > 1 else "",
                "distance": row['distance_ft'],
                "predicted": row['predicted_ft'],
                "range": row['status']
            })
        return jsonify(results)
        
    except Exception as e:
        # THIS IS THE "ANALYZABILITY" PART:
        # It prints the exact file and line number to your Pi terminal
        print("\n" + "!"*30)
        print("DEBUGGER TRACEBACK FOR AUDIT:")
        traceback.print_exc() 
        print("!"*30 + "\n")
        
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    # Using debug=True makes the traceback even more detailed
    app.run(host='0.0.0.0', port=5000, debug=True)

