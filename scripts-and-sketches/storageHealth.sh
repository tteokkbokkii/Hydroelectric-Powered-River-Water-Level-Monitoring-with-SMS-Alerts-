#!/bin/bash
MAIN_LOG="/home/admin/thesis/maintenance.log"
FILES=("/home/admin/bridge.log" "/home/admin/api.log" "/home/admin/web.log")
MAINTENANCE_DONE=false

for FILE in "${FILES[@]}"; do
    if [ -f "$FILE" ]; then
        # If log is over 5MB, clear it
        if [ $(stat -c%s "$FILE") -gt 5242880 ]; then
            cat /dev/null > "$FILE"
            echo "[$(date)] STORAGE: Rotated log: $FILE" >> "$MAIN_LOG"
            MAINTENANCE_DONE=true
        fi
    fi
done
sudo rm -rf /tmp/*

# REPORTING LOGIC
if [ "$MAINTENANCE_DONE" = true ]; then
    echo -e "\e[33mCLEANED\e[0m" # Yellow text if maintenance was performed
else
    echo "ok"
fi