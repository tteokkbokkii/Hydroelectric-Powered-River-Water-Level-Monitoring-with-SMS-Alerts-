#!/bin/bash
# Simple Integrity Check
DB_PATH="/home/admin/thesis/server/river_data.db"
if [ -f "$DB_PATH" ]; then
    sqlite3 "$DB_PATH" "PRAGMA integrity_check;"
    echo "[$(date)] Database Integrity: OK"
else
    echo "[$(date)] Database file not found."
fi