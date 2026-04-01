from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import json

app = Flask(__name__)
CORS(app)

DB_PATH = 'river_monitor.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/data', methods=['GET'])
def get_recent_logs():
    try:
        conn = get_db_connection()
        query = "SELECT * FROM readings ORDER BY id DESC LIMIT 50"
        rows = conn.execute(query).fetchall()
        conn.close()

        results = []
        for row in rows:
            results.append({
                "id": row['id'],
                "date": row['date'],
                "time": row['time'],
                "distance": row['distance'],
                "range": row['range'],
                "predicted": row['predicted']
            })
        
        return jsonify(results)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    selected_date = request.args.get('date')
    try:
        conn = get_db_connection()
        query = "SELECT * FROM readings WHERE date = ? ORDER BY time ASC"
        rows = conn.execute(query, (selected_date,)).fetchall()
        conn.close()

        results = [dict(row) for row in rows]
        return jsonify(results)
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/settings', methods=['GET', 'POST']) # <--- Must have BOTH
def settings():
    if request.method == 'GET':
        # If the file exists, return the saved settings
        try:
            with open('settings.json', 'r') as f:
                return jsonify(json.load(f))
        except FileNotFoundError:
            # Return defaults if no file exists yet
            return jsonify({
                "threshold_normal": 6.5,
                "threshold_attention": 8.0,
                "threshold_critical": 9.5,
                "reading_interval": 5,
                "predicting_interval": 60
            })

    if request.method == 'POST':
        data = request.json
        with open('settings.json', 'w') as f:
            json.dump(data, f)
        print(f"✅ Settings saved: {data}")
        return jsonify({"status": "success"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)