import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import mqtt from 'mqtt';

function RiverLevel() {
  // 1. State Hooks
  const [isManual, setIsManual] = useState(false);
  const [manualLevel, setManualLevel] = useState(7.00);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [predictedLevel, setPredictedLevel] = useState(0);

  // 2. Constants for UI
  const minLevel = 5;
  const maxLevel = 12;
  const rulerSpan = 80;
  const rulerOffset = 10;

  const statusLevels = [
    { label: "NORMAL THRESHOLD", min: 0, color: "#0072CE" },
    { label: "NEEDS ATTENTION", min: 9.0, color: "#FFA500" },
    { label: "HIGHLY CRITICAL", min: 10.5, color: "#FF4500" },
    { label: "EXTREMELY CRITICAL", min: 11.5, color: "#FF0000" }
  ];

  // 3. MQTT Logic
  useEffect(() => {
    const client = mqtt.connect('ws://192.168.100.97:9001');

    client.on('connect', () => {
      console.log('Connected to Pi MQTT!');
      client.subscribe('home/tank/level'); 
    });

    client.on('message', (topic, message) => {
      const rawCm = parseFloat(message.toString());
      if (!isNaN(rawCm)) {
        // Convert the incoming CM from ESP32 to Feet
        const feet = rawCm / 30.48; 
        
        setCurrentLevel(feet);
        // Using your logic: Predicted is roughly current + 0.5ft
        setPredictedLevel(feet + 0.5); 
        
        console.log(`Live MQTT Data: ${rawCm}cm -> ${feet.toFixed(2)}ft`);
      }
    });

    client.on('error', (err) => {
      console.error('MQTT Connection Error: ', err);
    });

    return () => {
      if (client) client.end();
    };
  }, []);

  // 4. Derived Variables (Must be inside the function to react to state changes)
  const displayLevel = isManual ? manualLevel : currentLevel;
  const displayPredicted = isManual ? (manualLevel + 0.5) : predictedLevel; 
  const currentStatus = [...statusLevels].reverse().find(s => displayLevel >= s.min) || statusLevels[0];

  const calibrate = (val) => {
    const normalized = (val - minLevel) / (maxLevel - minLevel);
    // Prevents the bar from going off-chart if level is below minLevel
    const clampedNormalized = Math.max(0, Math.min(1, normalized));
    return minLevel + (clampedNormalized * (maxLevel - minLevel) * (rulerSpan / 100)) + ((rulerOffset / 100) * (maxLevel - minLevel));
  };

  const data = [{
    time: 'Live',
    current: calibrate(displayLevel),
    predicted: calibrate(displayPredicted)
  }];

  // 5. Render UI
  return (
    <div className="card-container" id="riverlevel">
      <div id="riverlevel-card-header">
        <h2 className="card-title" id='riverlevel-title'>LIVE LEVEL OF RIVER WATER</h2>
        <div className="status-indicator" style={{ backgroundColor: currentStatus.color }}>
          {currentStatus.label}
        </div>
      </div>

      <div className="innercard-container" id='riverlevel-contents'>         
        <div className='live-expected'>
          <p>PREDICTED</p>
          <h1>{displayPredicted.toFixed(2)} ft.</h1>
        </div>
        <div className='live-current'>
          <p>CURRENT</p>
          <h1>{displayLevel.toFixed(2)} ft.</h1>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap="-100%" barCategoryGap={0} margin={0}>
            <XAxis hide dataKey="time" />
            <YAxis hide domain={[minLevel, maxLevel]}/>
            <Bar dataKey="predicted" fill="#008cff66" isAnimationActive={false} />
            <Bar dataKey="current" fill="#1e00ff99" isAnimationActive={false} />
            <g>
              <line x1="45%" y1="10%" x2="45%" y2="90%" stroke="black" strokeWidth="2" />
              {Array.from({ length: (maxLevel - minLevel) * 4 + 1 }).map((_, i) => {
                const val = maxLevel - (i * 0.25);
                if (val < minLevel) return null;
                const yPos = `${((maxLevel - val) / (maxLevel - minLevel)) * 80 + 10}%`;
                const isWhole = val % 1 === 0;
                const isHalf = val % 1 === 0.5;
                return (
                  <g key={val}>
                    <line 
                      x1={isWhole ? "42.5%" : isHalf ? "43.5%" : "44.2%"} 
                      y1={yPos} x2={isWhole ? "47.5%" : isHalf ? "46.5%" : "45.8%"} y2={yPos} 
                      stroke="black" strokeWidth={isWhole ? "2" : "1"} 
                    />
                    {isWhole && <text x="49%" y={yPos} dy="5" fontSize="14" fontWeight="bold" fill="black">{val} ft.</text>}
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