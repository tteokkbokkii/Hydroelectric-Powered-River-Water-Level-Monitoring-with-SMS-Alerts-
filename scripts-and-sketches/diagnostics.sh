#!/bin/bash
# Formatting Colors
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${CYAN}=========================================================${NC}"
echo -e "       SYSTEM HEALTH CHECK MAINTENANCE            "
echo -e "       Report Generated: $(date)                  "
echo -e "${CYAN}=========================================================${NC}"

# 1. CORE AUTOMATION CHECK
echo -e "\n[1] AUTOMATION SERVICE STATUS:"
# Verifies if the background manager script is currently active
pgrep -fl "databaseManager.sh" > /dev/null && echo -e "  Manager Service: ${CYAN}RUNNING${NC}" || echo -e "  Manager Service: ${RED}STOPPED${NC}"

# 2. COMPONENT AUDIT (MAINTENANCE SCRIPTS)
echo -e "\n[2] COMPONENT AUDIT:"

# Storage check
echo -n "  Storage Status:   "
/home/admin/thesis/scripts-and-sketches/storageHealth.sh
echo "" # <--- This fixes the spacing

# Flask check
echo -n "  Flask API Status: "
/home/admin/thesis/scripts-and-sketches/flaskHealth.sh
echo "" # <--- This fixes the spacing

# Database check
echo -n "  Database Status:  "
/home/admin/thesis/scripts-and-sketches/databaseHealth.sh
# No echo "" needed here because databaseHealth.sh already prints a new line

# 3. EXTERNAL STORAGE STATUS
echo -e "\n[3] EXTERNAL DRIVE STATUS:"

# --- AUTO-MOUNT LOGIC START ---
# Check if the USB hardware (sda1 or sdb1) is plugged in but not mounted correctly
USB_DEV=$(lsblk -no NAME,MOUNTPOINT | grep -E "sda1|sdb1" | awk '$2=="" {print "/dev/"$1}')

if [ ! -z "$USB_DEV" ]; then
    # If hardware is found but not mounted, force mount it to MULTIBOOT
    sudo mkdir -p /media/admin/MULTIBOOT
    sudo mount "$USB_DEV" /media/admin/MULTIBOOT > /dev/null 2>&1
fi
# --- AUTO-MOUNT LOGIC END ---

if [ -d "/media/admin/MULTIBOOT" ]; then
    echo -e "  USB Drive: ${CYAN}CONNECTED${NC}"
    df -h "/media/admin/MULTIBOOT" | awk 'NR==2 {print "  Available: " $4}'
else
    echo -e "  USB Drive: ${YELLOW}NOT DETECTED${NC}"
    echo "  System Action: Retaining data volumes on internal SD card."
fi

# 4. RECENT SYSTEM LOGS
echo -e "\n[4] RECENT MAINTENANCE LOG ENTRIES:"
if [ -f "/home/admin/thesis/maintenance.log" ]; then
    # Displays the last 3 logged actions from the manager
    tail -n 3 "/home/admin/thesis/maintenance.log" | sed 's/^/  /'
else
    echo "  Status: No maintenance log found."
fi 

echo -e "\n${CYAN}==================================================${NC}"