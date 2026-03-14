import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

function RiverLevel() {
  const [isManual, setIsManual] = useState(false);
  const [manualLevel, setManualLevel] = useState(7.00);
  const [currentLevel, setCurrentLevel] = useState(8.5);
  const [predictedLevel, setPredictedLevel] = useState(10.5);

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

  // Fetch latest reading and its predicted value
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const response = await fetch('/monitorData.json');
        const data = await response.json();
        if (data.length > 0) {
          const latest = data[data.length - 1];
          setCurrentLevel(latest.distance);
          setPredictedLevel(latest.predicted);
        }
      } catch (error) {
        console.error('Error fetching monitor data:', error);
      }
    };

    fetchLatest();
    const interval = setInterval(fetchLatest, 5000);
    return () => clearInterval(interval);
  }, []);

  const displayLevel = isManual ? manualLevel : currentLevel;
  const displayPredicted = isManual ? predictedLevel : predictedLevel; // predicted is from data

  const currentStatus = [...statusLevels].reverse().find(s => displayLevel >= s.min) || statusLevels[0];

  const calibrate = (val) => {
    const normalized = (val - minLevel) / (maxLevel - minLevel);
    return minLevel + (normalized * (maxLevel - minLevel) * (rulerSpan / 100)) + ((rulerOffset / 100) * (maxLevel - minLevel));
  };

  const data = [{
    time: 'Live',
    current: calibrate(displayLevel),
    predicted: calibrate(displayPredicted)
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