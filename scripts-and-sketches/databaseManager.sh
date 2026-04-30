#!/bin/bash

# --- CONFIGURATION ---
DB_DIR="/home/admin/thesis/server"
DB_NAME="river_monitor.db"
DB_PATH="$DB_DIR/$DB_NAME"
USB_MOUNT="/media/admin/USB Drive"
USB_DEST="$USB_MOUNT/thesis_backups"
MAIN_LOG="/home/admin/thesis/maintenance.log"

# --- THRESHOLDS ---
SIZE_LIMIT=100000       # Rotate DB when it hits 100MB
SD_FREE_LIMIT=5000000   # Emergency Mode: 5GB free space (in KB)

while true; do
    # 1. MONITOR SD CARD HEALTH
    # Checks free space on the Raspberry Pi 32GB SD card
    SD_FREE=$(df "$DB_DIR" | awk 'NR==2 {print $4}')

    # 2. THE ROTATION TRIGGER (New Book Logic)
    if [ -f "$DB_PATH" ]; then
        CURRENT_SIZE=$(du -k "$DB_PATH" | cut -f1)
        
        if [ "$CURRENT_SIZE" -gt "$SIZE_LIMIT" ]; then
            echo "[$(date)] MANAGER: DB limit reached ($CURRENT_SIZE KB). Rotating..." >> "$MAIN_LOG"
            
            # ZERO-LAPSE HANDOFF: Rename the active file
            TEMP_NAME="held_archive_$(date +%Y%m%d_%H%M).db"
            mv "$DB_PATH" "$DB_DIR/$TEMP_NAME"
            
            # RE-INITIALIZE: Create the fresh empty database
            python3 "$DB_DIR/database.py"

            # STORAGE DECISION: USB vs SD Card vs Emergency Purge
            if [ -d "$USB_MOUNT" ]; then
                # Move to USB immediately
                mv "$DB_DIR/$TEMP_NAME" "$USB_DEST/$TEMP_NAME"
                sync
                echo "✅ Success: Volume offloaded to USB." >> "$MAIN_LOG"
            elif [ "$SD_FREE" -gt "$SD_FREE_LIMIT" ]; then
                # Hold on SD card (Pi has > 5GB free)
                echo "⚠️ No USB: Holding $TEMP_NAME on SD card." >> "$MAIN_LOG"
            else
                # EMERGENCY: Delete to prevent OS crash
                echo "❌ CRITICAL: Low Space (<5GB). Purging $TEMP_NAME to save system!" >> "$MAIN_LOG"
                rm "$DB_DIR/$TEMP_NAME"
            fi
        fi
    fi

    # 3. USB AUTOMATION (Daily Sync & Catch-up)
    if [ -d "$USB_MOUNT" ]; then
        mkdir -p "$USB_DEST"
        
        # A. OFFLOAD HELD ARCHIVES: Automatically grab files waiting for USB
        if ls "$DB_DIR"/held_archive_*.db 1> /dev/null 2>&1; then
            echo "[$(date)] USB DETECTED: Moving held archives to storage..." >> "$MAIN_LOG"
            mv "$DB_DIR"/held_archive_*.db "$USB_DEST/"
            sync
        fi

        # B. DAILY CUMULATIVE BACKUP (Purge and Sync)
        DAILY_FILE="river_monitor_$(date +%Y-%m-%d).db"
        if [ ! -f "$USB_DEST/$DAILY_FILE" ]; then
            # Remove existing daily versions to save space, keeping 'ARCHIVE' files
            find "$USB_DEST" -name "river_monitor_*.db" -delete
            cp "$DB_PATH" "$USB_DEST/$DAILY_FILE"
            sync
            echo "[$(date)] MANAGER: Daily sync successful." >> "$MAIN_LOG"
        fi
    fi

    # Check every 10 minutes (600 seconds)
    sleep 600
done