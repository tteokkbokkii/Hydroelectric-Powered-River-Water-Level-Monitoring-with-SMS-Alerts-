#!/bin/bash
API_URL="http://127.0.0.1:5000/api/data"
MAIN_LOG="/home/admin/thesis/maintenance.log"

# Get the HTTP status code
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)

if [ "$STATUS" -eq 200 ]; then
    echo "ok"
else
    # Report the ERROR to the dashboard in RED
    echo -e "\e[31mERROR ($STATUS)\e[0m"
    
    # Log the crash and attempt restart in the background
    echo "[$(date)] HEALTH: API Error ($STATUS). Restarting..." >> "$MAIN_LOG"
    pkill -f "python3 app.py"
    cd "/home/admin/thesis/server"
    source venv/bin/activate
    python3 app.py > /home/admin/api.log 2>&1 &
fi