#!/bin/bash

# --- COLOR DEFINITIONS ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# --- PRE-START CLEANUP ---
pkill -f "python3 bridge.py"
pkill -f "python3 app.py"
pkill -f "http.server"

clear
echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}   RIVER MONITORING SYSTEM: MASTER BOOT   ${NC}"
echo -e "${CYAN}==========================================${NC}"

# --- NETWORK SELECTION ---
echo -e "${YELLOW}Select Network Mode:${NC}"
echo -e "1) ${GREEN}FIELD MODE${NC} (Pi Hotspot)"
echo -e "2) ${BLUE}LAB MODE${NC}   (External WiFi)"

# FIX: Combined your two read commands into one functional timeout
read -t 120 -n 1 -p "Selection [1-2] (Auto-default to FIELD MODE in 120s): " mode
echo "" # Move to a new line after input

if [ -z "$mode" ]; then
    echo -e "\n${RED}No input detected. Resuming Field Mode for autonomous monitoring...${NC}"
    mode="1"
fi

if [ "$mode" == "1" ]; then
    echo -e "${YELLOW}📡 Activating Hotspot: 'River-Monitor'...${NC}"
    # FIX: Tries Hotspot profile first, then River-Monitor, then creates one
    sudo nmcli con up "Hotspot" || sudo nmcli con up "River-Monitor" || sudo nmcli device wifi hotspot ssid River-Monitor password thesis2026

elif [ "$mode" == "2" ]; then
    echo -e "${YELLOW}🔎 Checking for known networks in range...${NC}"

    SAVED_IN_RANGE=$(nmcli -t -f SSID dev wifi list | grep -Fxf <(nmcli -t -f NAME connection show))

    if [ ! -z "$SAVED_IN_RANGE" ]; then
        echo -e "${GREEN}Detected known networks nearby:${NC}"
        mapfile -t options <<< "$SAVED_IN_RANGE"
        options+=("Connect to a new network...")

        PS3=$(echo -e "${CYAN}Select a network [1-${#options[@]}]: ${NC}")
        select ssid in "${options[@]}"; do
            if [ "$ssid" == "Connect to a new network..." ]; then
                CONNECTED=false
                break
            elif [ ! -z "$ssid" ]; then
                echo -e "${GREEN}🔗 Connecting to $ssid...${NC}"
                sudo nmcli con up "$ssid" && CONNECTED=true
                break
            fi
        done
    fi

    if [ "$CONNECTED" != true ]; then
        echo -e "${YELLOW}🔎 Scanning all available WiFi...${NC}"
        nmcli -f SSID,SIGNAL,SECURITY device wifi list
        echo -e "${CYAN}------------------------------------------${NC}"
        read -p "Enter SSID to connect: " manual_ssid

        # FIX: Deletes old profile to prevent "property is missing" error
        sudo nmcli connection delete "$manual_ssid" > /dev/null 2>&1

        if nmcli connection show "$manual_ssid" >/dev/null 2>&1; then
             echo -e "${GREEN}🔗 Connecting to saved profile: $manual_ssid...${NC}"
             sudo nmcli con up "$manual_ssid"
        else
             # FIX: Added -s for silent password entry
             read -s -p "Enter Password for $manual_ssid: " wpapass
             echo ""
             echo -e "${YELLOW}🔗 Saving and connecting...${NC}"
             sudo nmcli device wifi connect "$manual_ssid" password "$wpapass" name "$manual_ssid"
        fi
    fi
fi

# --- STARTING SERVICES ---
echo -e "${CYAN}------------------------------------------${NC}"
echo -e "${YELLOW}🚀 Launching System Services...${NC}"

BASE_DIR="/home/admin/thesis"

# 1. Start Bridge
cd "$BASE_DIR" # Ensure we are in the correct root
# FIX: Use full paths for python execution
/usr/bin/python3 /home/admin/thesis/server/bridge.py > ~/bridge.log 2>&1 &
echo -e "✅ ${GREEN}Bridge:${NC} Listening for ESP32..."

# 2. Start API
/usr/bin/python3 /home/admin/thesis/server/app.py > ~/api.log 2>&1 &
echo -e "✅ ${GREEN}API:${NC}    Ready on Port 5000"

# 3. Start UI
cd "$BASE_DIR/system"
/usr/bin/python3 -m http.server 8000 --directory dist > ~/web.log 2>&1 &
echo -e "✅ ${GREEN}UI:${NC}     Ready on Port 8000"

# --- OUTPUT SUMMARY ---
IP_ADDR=$(hostname -I | awk '{print $1}')

echo -e "${CYAN}==========================================${NC}"
echo -e "${GREEN}SYSTEM ONLINE${NC}"
echo -e "${YELLOW}Dashboard:${NC} http://rivermonitoring.local:8000"
echo -e "${YELLOW}Data API: ${NC} http://rivermonitoring.local:5000/api/data"
echo -e "${CYAN}==========================================${NC}"
echo -e "${RED}Press [CTRL+C] to shutdown all services.${NC}"

trap "echo -e '\n${RED}Shutting down...${NC}'; kill 0" EXIT
wait