#!/bin/bash
DB_PATH="/home/admin/thesis/server/river_monitor.db"
if [ -f "$DB_PATH" ]; then
    # Run integrity check silently, only report if OK
    CHECK=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;")
    if [ "$CHECK" == "ok" ]; then
        echo "ok"
    else
        echo -e "\e[31mCORRUPT\e[0m"
    fi
else
    echo -e "\e[31mNOT FOUND\e[0m"
fi