#!/bin/bash
# Formatting Colors
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${CYAN}==================================================${NC}"
echo -e "         SYSTEM HEALTH CHECK MAINTENANCE          "
echo -e "         Report Generated: $(date +'%a %d %b %H:%M:%S %Z %Y')"
echo -e "${CYAN}==================================================${NC}"

# 1. CORE AUTOMATION CHECK
echo -e "\n[1] AUTOMATION SERVICE STATUS:"
if pgrep -fl "databaseManager.sh" > /dev/null; then
    printf "  %-20s ${CYAN}%s${NC}\n" "Manager Service:" "RUNNING"
else
    printf "  %-20s ${RED}%s${NC}\n" "Manager Service:" "STOPPED"
fi

# 2. COMPONENT AUDIT
echo -e "\n[2] COMPONENT AUDIT:"
printf "  %-20s " "Storage Status:"
bash /home/admin/thesis/scripts-and-sketches/storageHealth.sh

printf "  %-20s " "Flask API Status:"
bash /home/admin/thesis/scripts-and-sketches/flaskHealth.sh

printf "  %-20s " "Database Status:"
bash /home/admin/thesis/scripts-and-sketches/databaseHealth.sh

# 3. EXTERNAL STORAGE STATUS
echo -e "\n[3] EXTERNAL DRIVE STATUS:"
USB_DEV=$(lsblk -no NAME,MOUNTPOINT | grep -E "sda1|sdb1" | awk '$2=="" {print "/dev/"$1}')
if [ ! -z "$USB_DEV" ]; then
    sudo mkdir -p /media/admin/MULTIBOOT
    sudo mount "$USB_DEV" /media/admin/MULTIBOOT > /dev/null 2>&1
fi

if [ -d "/media/admin/MULTIBOOT" ]; then
    printf "  %-20s ${CYAN}%s${NC}\n" "USB Drive:" "CONNECTED"
    df -h "/media/admin/MULTIBOOT" | awk 'NR==2 {printf "  %-20s %s\n", "Available:", $4}'
else
    printf "  %-20s ${YELLOW}%s${NC}\n" "USB Drive:" "NOT DETECTED"
    echo "  System Action:        Retaining data volumes on internal SD card."
fi

# 4. RECENT SYSTEM LOGS
echo -e "\n[4] RECENT MAINTENANCE LOG ENTRIES:"
if [ -f "/home/admin/thesis/maintenance.log" ]; then
    tail -n 3 "/home/admin/thesis/maintenance.log" | sed 's/^/  /'
else
    echo "  Status:               No maintenance log found."
fi 

echo -e "\n${CYAN}==================================================${NC}"