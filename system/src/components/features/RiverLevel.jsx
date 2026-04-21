import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

function RiverLevel({ currentLevel, predictedLevel }) {
  // Calibration settings
  const minLevel = 5;
  const maxLevel = 12;

  const statusLevels = [
    { label: "NORMAL THRESHOLD", min: 0, color: "#0072CE" },
    { label: "NEEDS ATTENTION", min: 9.0, color: "#FFA500" },
    { label: "HIGHLY CRITICAL", min: 10.5, color: "#FF4500" },
    { label: "EXTREMELY CRITICAL", min: 11.5, color: "#FF0000" }
  ];

  const displayLevel = currentLevel || 0;
  const displayPredicted = predictedLevel || 0;

  // Determine status based on thresholds (using default thresholds for now, or you could load from localStorage)
  let statusLabel = 'NORMAL THRESHOLD';
  let statusColor = '#0072CE';
  if (displayLevel >= 10.5) {
    statusLabel = 'HIGHLY CRITICAL';
    statusColor = '#FF4500';
  } else if (displayLevel >= 9.0) {
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
          <p>PREDICTED</p>
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