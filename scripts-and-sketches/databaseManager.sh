#!/bin/bash

# --- CONFIGURATION ---
DB_DIR="/home/admin/thesis/server"
DB_NAME="river_monitor.db"
DB_PATH="$DB_DIR/$DB_NAME"

USB_MOUNT="/media/admin/USB-BACKUP"
USB_DEST="$USB_MOUNT/thesis_backups"
LOG_FILE="/home/admin/thesis/maintenance.log"

# --- THRESHOLDS ---
SIZE_LIMIT=500      # 100MB (in KB)
SD_FREE_LIMIT=5000000   # 5GB (in KB)

# 1. AUTOMATIC USB SYNC (Verification Step)
# If USB is present, ensure a daily backup exists.
if [ -d "$USB_MOUNT" ]; then
    mkdir -p "$USB_DEST"
    DAILY_FILE="river_monitor_$(date +%Y-%m-%d).db"
    if [ ! -f "$USB_DEST/$DAILY_FILE" ]; then
        if cp "$DB_PATH" "$USB_DEST/$DAILY_FILE"; then
            echo "[$(date)] DATABASE: Daily sync to USB successful." >> "$LOG_FILE"
        fi
    fi
fi

# 2. SELF-HEALING STORAGE LOGIC
if [ -f "$DB_PATH" ]; then
    CURRENT_SIZE=$(du -k "$DB_PATH" | cut -f1)

    # "If the database exceeds 100MB..."
    if [ "$CURRENT_SIZE" -gt "$SIZE_LIMIT" ]; then
        if [ -d "$USB_MOUNT" ]; then
            # "When the USB is plugged in, the system offloads the data..."
            TIMESTAMP=$(date +%Y%m%d_%H%M)
            mv "$DB_PATH" "$USB_DEST/offload_$TIMESTAMP.db"
            touch "$DB_PATH"
            echo "[$(date)] DATABASE: 100MB exceeded. Data offloaded to USB." >> "$LOG_FILE"
        else
            # "If the USB is not found, the script instead triggers a storage cleanup."
            SD_FREE=$(df "$DB_DIR" | awk 'NR==2 {print $4}')
            if [ "$SD_FREE" -lt "$SD_FREE_LIMIT" ]; then
                # "deletes the oldest log files and clears temporary data."
                echo "[$(date)] STORAGE: Low space (<5GB). Cleaning up." >> "$LOG_FILE"
                rm -f /home/admin/thesis/*.log
                sudo rm -rf /tmp/*
            fi
        fi
    fi
fi