import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import mqtt from 'mqtt';

function RiverLevel({ currentLevel: propLevel, predictedLevel: propPredicted }) {
  const [mqttLevel, setMqttLevel] = useState(0);
  const [mqttPredicted, setMqttPredicted] = useState(0);
  const [thresholds, setThresholds] = useState(() => {
    const saved = localStorage.getItem('riverlevel_thresholds');
    return saved ? JSON.parse(saved) : { normal: 6.5, attention: 8.0, critical: 9.5 };
  });

  // Calibration settings
  const minLevel = 5;
  const maxLevel = 12;

  // Save thresholds to localStorage when they change
  useEffect(() => {
    localStorage.setItem('riverlevel_thresholds', JSON.stringify(thresholds));
  }, [thresholds]);

  // Subscribe to MQTT for sensor readings and settings
  useEffect(() => {
    const client = mqtt.connect('ws://192.168.43.154:9001');

    client.on('connect', () => {
      console.log('RiverLevel MQTT connected');
      client.subscribe('sensor/hulo/reading');
      client.subscribe('system/settings');
    });

    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        if (topic === 'sensor/hulo/reading') {
          setMqttLevel(data.distance);
          setMqttPredicted(data.predicted);
        } else if (topic === 'system/settings') {
          setThresholds({
            normal: data.threshold_normal,
            attention: data.threshold_attention,
            critical: data.threshold_critical
          });
        }
      } catch (e) {
        console.error('MQTT parse error:', e);
      }
    });

    return () => {
      if (client) client.end();
    };
  }, []);

  // Priority: live MQTT data over props
  const displayLevel = mqttLevel > 0 ? mqttLevel : propLevel;
  const displayPredicted = mqttPredicted > 0 ? mqttPredicted : propPredicted;

  // Determine status based on thresholds (using the same logic as announcement bar)
  let statusLabel = 'NORMAL THRESHOLD';
  let statusColor = '#0072CE';
  if (displayLevel >= thresholds.critical) {
    statusLabel = 'HIGHLY CRITICAL';
    statusColor = '#FF4500';
  } else if (displayLevel >= thresholds.attention) {
    statusLabel = 'NEEDS ATTENTION';
    statusColor = '#FFA500';
  } else {
    statusLabel = 'NORMAL THRESHOLD';
    statusColor = '#0072CE';
  }

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
        <div className="status-indicator" style={{ backgroundColor: statusColor }}>
          {statusLabel}
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