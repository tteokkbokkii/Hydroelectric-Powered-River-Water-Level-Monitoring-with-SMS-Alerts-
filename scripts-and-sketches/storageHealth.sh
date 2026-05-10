#!/bin/bash
MAIN_LOG="/home/admin/thesis/maintenance.log"
FILES=("/home/admin/bridge.log" "/home/admin/api.log" "/home/admin/web.log")
MAINTENANCE_DONE=false

for FILE in "${FILES[@]}"; do
    if [ -f "$FILE" ]; then
        if [ $(stat -c%s "$FILE") -gt 5242880 ]; then
            cat /dev/null > "$FILE"
            echo "[$(date)] STORAGE: Rotated log: $FILE" >> "$MAIN_LOG"
            MAINTENANCE_DONE=true
        fi
    fi
done

find /tmp -mindepth 1 -maxdepth 1 ! -name "tmux-*" -exec rm -rf {} + 2>/dev/null

if [ "$MAINTENANCE_DONE" = true ]; then
    echo -e "\e[33mCLEANED\e[0m"
else
    echo "ok"
fi