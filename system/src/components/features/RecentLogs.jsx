import { useState, useEffect } from 'react';
import mqtt from 'mqtt'; // 1. Added MQTT import

function RecentLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // 2. Connect to the Pi
    const client = mqtt.connect('ws://192.168.100.97:9001');

    client.on('connect', () => {
      console.log('Logs connected to MQTT');
      client.subscribe('home/tank/level');
    });

    client.on('message', (topic, message) => {
      const rawCm = parseFloat(message.toString());
      if (!isNaN(rawCm)) {
        const feet = rawCm / 30.48;
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });

        // Determine the range based on your thresholds
        let range = "NORMAL";
        if (feet >= 11.5) range = "CRITICAL";
        else if (feet >= 9.0) range = "WARNING";

        const newEntry = {
          time: timeStr,
          range: range,
          distance: feet
        };

        setLogs((prevLogs) => {
          // Add new reading to the top (index 0)
          const updated = [newEntry, ...prevLogs];
          // Keep it to the last 19 readings as per your original code
          return updated.slice(0, 19);
        });
      }
    });

    return () => { if (client) client.end(); };
  }, []);

  // --- YOUR ORIGINAL UI ---
  return (
    <div className='card-container' id='recentlogs'>
      <h2 className='card-title'>RECENT LOGS</h2>
      <div className='innercard-container' id='recentlogs-contents'>
        {logs.map((log, index) => (
          <p key={index}>
            [{log.time}] - [{log.range}] WATER ELEVATION: {log.distance.toFixed(2)} ft.
          </p>
        ))}
      </div>
    </div>
  );
}

export default RecentLogs;