import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import mqtt from 'mqtt';

function RiverLevel({ currentLevel: propLevel, predictedLevel: propPredicted }) {
  const [mqttLevel, setMqttLevel] = useState(0);
  const [mqttPredicted, setMqttPredicted] = useState(0);

  // Calibration settings
  const minLevel = 5;
  const maxLevel = 12;

  const statusLevels = [
    { label: "NORMAL THRESHOLD", min: 0, color: "#0072CE" },
    { label: "NEEDS ATTENTION", min: 9.0, color: "#FFA500" },
    { label: "HIGHLY CRITICAL", min: 10.5, color: "#FF4500" },
    { label: "EXTREMELY CRITICAL", min: 11.5, color: "#FF0000" }
  ];

  useEffect(() => {
    // Aligned with Raspberry Pi Hotspot IP and default Mosquitto WebSocket port
    const client = mqtt.connect('ws://192.168.43.154:5000');

    client.on('connect', () => {
      client.subscribe('sensor/hulo/reading'); 
      console.log("MQTT Connected to Raspberry Pi");
    });

    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        // Aligned with unified keys: distance and predicted
        setMqttLevel(data.distance);
        setMqttPredicted(data.predicted);
      } catch (e) {
        console.error("Payload format error:", e);
      }
    });

    return () => {
      if (client) client.end();
    };
  }, []);

  // Priority: 1. Live MQTT data, 2. Database Props
  const displayLevel = mqttLevel > 0 ? mqttLevel : propLevel;
  const displayPredicted = mqttPredicted > 0 ? mqttPredicted : propPredicted; 
  
  const currentStatus = [...statusLevels].reverse().find(s => displayLevel >= s.min) || statusLevels[0];

  const calibrate = (val) => {
    const normalized = (val - minLevel) / (maxLevel - minLevel);
    const clamped = Math.max(0, Math.min(1, normalized));
    return minLevel + (clamped * (maxLevel - minLevel));
  };

  const chartData = [{
    time: 'Live',
    current: calibrate(displayLevel),
    predicted: calibrate(displayPredicted)
  }];

  return (
    <div className="card-container" id="riverlevel">
      <div id="riverlevel-card-header">
        <h2 className="card-title">LIVE LEVEL OF RIVER WATER</h2>
        <div className="status-indicator" style={{ backgroundColor: currentStatus.color }}>
          {currentStatus.label}
        </div>
      </div>

      <div className="innercard-container" id='riverlevel-contents'>         
        <div className='live-expected'>
          <p>PREDICTED (5-MIN)</p>
          <h1>{displayPredicted.toFixed(2)} ft.</h1>
        </div>
        <div className='live-current'>
          <p>CURRENT</p>
          <h1>{displayLevel.toFixed(2)} ft.</h1>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap="-100%" barCategoryGap={0}>
            <XAxis hide dataKey="time" />
            <YAxis hide domain={[minLevel, maxLevel]}/>
            <Bar dataKey="predicted" fill="#008cff44" isAnimationActive={true} />
            <Bar dataKey="current" fill="#1e00ff99" isAnimationActive={true} />
            
            <g>
              <line x1="50%" y1="10%" x2="50%" y2="90%" stroke="#333" strokeWidth="2" />
              {Array.from({ length: (maxLevel - minLevel) * 4 + 1 }).map((_, i) => {
                const val = maxLevel - (i * 0.25);
                if (val < minLevel) return null;
                const yPos = `${((maxLevel - val) / (maxLevel - minLevel)) * 80 + 10}%`;
                const isWhole = val % 1 === 0;
                return (
                  <g key={val}>
                    <line 
                      x1={isWhole ? "46%" : "48%"} y1={yPos} 
                      x2={isWhole ? "54%" : "52%"} y2={yPos} 
                      stroke="#333" strokeWidth={isWhole ? "2" : "1"} 
                    />
                    {isWhole && (
                      <text x="56%" y={yPos} dy="5" fontSize="12" fontWeight="bold">
                        {val}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default RiverLevel;