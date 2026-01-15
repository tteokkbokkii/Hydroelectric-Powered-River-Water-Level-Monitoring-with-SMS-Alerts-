import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

function RiverLevel() {
  const [isManual, setIsManual] = useState(false); // Toggle for debugging
  const [manualLevel, setManualLevel] = useState(7.00);
  const [expectedLevel, setExpectedLevel] = useState(10.50);
  const [time, setTime] = useState(0);
  
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

  useEffect(() => {
    if (isManual) return;
    const interval = setInterval(() => {
      setTime((t) => t + 0.005);
      setExpectedLevel(9.75 + (0.75 * Math.cos(time * 0.5)));
    }, 50);
    return () => clearInterval(interval);
  }, [time, isManual]);

  // Logic: Use manual slider if debugging, otherwise use dynamic math
  const currentLevel = isManual ? manualLevel : (8.5 + (1.5 * Math.sin(time)));

  const currentStatus = [...statusLevels].reverse().find(s => currentLevel >= s.min) || statusLevels[0];

  const calibrate = (val) => {
    const normalized = (val - minLevel) / (maxLevel - minLevel);
    return minLevel + (normalized * (maxLevel - minLevel) * (rulerSpan / 100)) + ((rulerOffset / 100) * (maxLevel - minLevel));
  };

  const data = [{ 
    time: 'Live', 
    current: calibrate(currentLevel), 
    expected: calibrate(expectedLevel) 
  }];

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
            <p>EXPECTED</p>
            <h1>{expectedLevel.toFixed(2)} ft.</h1>
        </div>

        <div className='live-current'>
            <p>CURRENT</p>
            <h1>{currentLevel.toFixed(2)} ft.</h1>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap="-100%" barCategoryGap={0} margin={0}>
            <XAxis hide dataKey="time" />
            <YAxis hide domain={[minLevel, maxLevel]}/>

            <Bar dataKey="expected" fill="#008cff66" isAnimationActive={false} />
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

      {/* DEBUG CONTROL PANEL
      <div style={{ marginTop: '1rem', padding: '10px', background: '#ddd', borderRadius: '8px', display: 'flex', gap: '15px', alignItems: 'center' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
          <input type="checkbox" checked={isManual} onChange={() => setIsManual(!isManual)} /> DEBUG MODE
        </label>
        {isManual && (
          <input 
            type="range" min={minLevel} max={maxLevel} step="0.01" 
            value={manualLevel} onChange={(e) => setManualLevel(parseFloat(e.target.value))} 
            style={{ flexGrow: 1 }}
          />
        )}
      </div>*/}
    </div>
  );
}

export default RiverLevel;