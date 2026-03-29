from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3

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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)