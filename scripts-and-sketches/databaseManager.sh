#!/bin/bash

# --- CONFIGURATION ---
DB_DIR="/home/admin/thesis/server"
DB_NAME="river_monitor.db"
DB_PATH="$DB_DIR/$DB_NAME"

USB_MOUNT="/media/admin/USB-BACKUP"
USB_DEST="$USB_MOUNT/thesis_backups"
LOG_FILE="/home/admin/thesis/maintenance.log"

# --- THRESHOLDS ---
SIZE_LIMIT=100000       # 100MB (in KB)

log_msg() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# SELF-HEALING STORAGE LOGIC (Runs via Cron every 10 mins)
if [ -f "$DB_PATH" ]; then
    CURRENT_SIZE=$(du -k "$DB_PATH" | cut -f1)

    # "If the database exceeds 100MB..."
    if [ "$CURRENT_SIZE" -gt "$SIZE_LIMIT" ]; then
        
        # "...the script checks for an external USB drive."
        if mountpoint -q "$USB_MOUNT"; then
            
            # Offload safely using SQLite backup command
            TIMESTAMP=$(date +%Y%m%d_%H%M)
            sqlite3 "$DB_PATH" ".backup '$USB_DEST/offload_$TIMESTAMP.db'"
            rm "$DB_PATH" 
            log_msg "DATABASE: 100MB exceeded. Data offloaded to USB and DB reset."
            
        else
            log_msg "STORAGE: 100MB exceeded but USB not found. Triggering storage cleanup."
            # Call your dedicated storage script to handle the cleanup
            bash /home/admin/thesis/scripts-and-sketches/storageHealth.sh
        fi
    fi
fi