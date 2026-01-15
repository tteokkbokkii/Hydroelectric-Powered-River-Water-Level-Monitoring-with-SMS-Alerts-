import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

function RiverLevel() {
  const [expectedLevel, setExpectedLevel] = useState(10.50);
  const [time, setTime] = useState(0);
  const minLevel = 5;
  const maxLevel = 12;
  const rulerSpan = 80; 
  const rulerOffset = 10;

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((t) => t + 0.005);
      setExpectedLevel(9.75 + (0.75 * Math.cos(time * 0.5)));
    }, 50);
    return () => clearInterval(interval);
  }, [time]);

  const currentLevel = 8.5 + (1.5 * Math.sin(time));

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
      <h2 className="card-title">LIVE LEVEL OF RIVER WATER</h2>
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
            <XAxis
              hide dataKey="time"
              padding={{ left: 0, right: 0 }}
            />
            
            <YAxis hide domain={[minLevel, maxLevel]}/>

            <Bar
              dataKey="expected"
              fill="#008cff66"
              isAnimationActive={false}
            />
            
            <Bar
              dataKey="current"
              fill="#1e00ff99"
              isAnimationActive={false}
            />

            <g>
              <line x1="45%" y1="5%" x2="45%" y2="95%" stroke="black" strokeWidth="2" />

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
                      y1={yPos} 
                      x2={isWhole ? "47.5%" : isHalf ? "46.5%" : "45.8%"} 
                      y2={yPos} 
                      stroke="black" 
                      strokeWidth={isWhole ? "2" : "1"} 
                    />
                    
                    {isWhole && (
                      <text x="49%" y={yPos} dy="5" fontSize="14" fontWeight="bold" fill="black">
                      {val} ft.
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