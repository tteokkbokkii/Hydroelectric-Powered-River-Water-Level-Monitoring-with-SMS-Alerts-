#!/bin/bash

# --- CONFIGURATION ---
DB_DIR="/home/admin/thesis/server"
DB_NAME="river_monitor.db"
DB_PATH="$DB_DIR/$DB_NAME"
USB_MOUNT="/media/admin/MULTIBOOT"
USB_DEST="$USB_MOUNT/thesis_backups"
MAIN_LOG="/home/admin/thesis/maintenance.log"

# --- THRESHOLDS ---
SIZE_LIMIT=100000       # 100MB
SD_FREE_LIMIT=5000000   # 5GB

while true; do
    SD_FREE=$(df "$DB_DIR" | awk 'NR==2 {print $4}')

    if [ -f "$DB_PATH" ]; then
        CURRENT_SIZE=$(du -k "$DB_PATH" | cut -f1)
        
        if [ "$CURRENT_SIZE" -gt "$SIZE_LIMIT" ]; then
            echo "[$(date)] MANAGER: DB limit reached ($CURRENT_SIZE KB). Rotating..." >> "$MAIN_LOG"
            
            TEMP_NAME="held_archive_$(date +%Y%m%d_%H%M).db"
            mv "$DB_PATH" "$DB_DIR/$TEMP_NAME"
            
            # Re-initialize DB using the venv python
            /home/admin/thesis/server/venv/bin/python3 "$DB_DIR/database.py"

            if [ -d "$USB_MOUNT" ]; then
                mkdir -p "$USB_DEST"
                mv "$DB_DIR/$TEMP_NAME" "$USB_DEST/$TEMP_NAME"
                sync
                echo "✅ Success: Volume offloaded to USB." >> "$MAIN_LOG"
            elif [ "$SD_FREE" -gt "$SD_FREE_LIMIT" ]; then
                echo "⚠️ No USB: Holding $TEMP_NAME on SD card." >> "$MAIN_LOG"
            else
                echo "❌ CRITICAL: Low Space. Purging $TEMP_NAME!" >> "$MAIN_LOG"
                rm "$DB_DIR/$TEMP_NAME"
            fi
        fi
    fi

    # USB Catch-up Logic
    if [ -d "$USB_MOUNT" ]; then
        mkdir -p "$USB_DEST"
        if ls "$DB_DIR"/held_archive_*.db 1> /dev/null 2>&1; then
            mv "$DB_DIR"/held_archive_*.db "$USB_DEST/"
            sync
        fi
    fi

    sleep 600
dones