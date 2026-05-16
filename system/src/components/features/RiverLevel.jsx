/*
COMMENT LEGEND:
//1 : 1. Status Indicator Logic
//2 : FIX: Added missing closing bracket here
//3 : MAIN CHART LAYER
//4 : SVG GAUGE OVERLAY
//5 : Vertical Center Lines
//6 : Contrast shadow: Dark shadow for white text, Light shadow for dark text
*/

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  ReferenceLine 
} from 'recharts';

const currentIP = window.location.hostname || 'rivermonitoring.local';
const API_BASE = `http://${currentIP}:5000/api`;

const RiverLevel = ({ currentLevel, predictedLevel, predictedHour }) => {
  const minLevel = 0;
  const maxLevel = 11;

  const displayLevel = currentLevel || 0;
  const displayPredicted = predictedHour || predictedLevel || 0;

  const [thresholds, setThresholds] = useState({ attention: 4.01, critical: 7.06 });

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then(res => res.json())
      .then(data => {
        setThresholds({
          attention: parseFloat(data.threshold_attention) || 4.01,
          critical: parseFloat(data.threshold_critical) || 7.06
        });
      })
      .catch(err => console.error('Error fetching thresholds:', err));
  }, []);

  //1
  let statusLabel = 'NORMAL THRESHOLD';
  let statusColor = '#002D5A';

  if (displayLevel >= thresholds.critical) {
    statusLabel = 'HIGHLY CRITICAL';
    statusColor = '#e33d00';
  } else if (displayLevel >= thresholds.attention) {
    statusLabel = 'NEEDS ATTENTION';
    statusColor = '#d58a00';
  }

  const calibrate = (val) => Math.max(minLevel, Math.min(maxLevel, val));

  const chartData = [{
    time: 'Live',
    current: calibrate(displayLevel),
    predicted: calibrate(displayPredicted)
  }];

  const getVisualY = (val) => {
      const chartHeight = 100;
      const marginOffset = 5.00;
      return ((maxLevel - val) / (maxLevel - minLevel)) * (chartHeight - (marginOffset * 2)) + marginOffset;
    };

  return (
    <div className="card-container" id="riverlevel">
      <div id="riverlevel-card-header">
        <h2 className="card-title">LIVE LEVEL OF RIVER WATER</h2>
        <div className="status-indicator" style={{ backgroundColor: statusColor }}>
          <Link to="/System" style={{ display: 'contents', textDecoration: 'none', color: 'inherit' }}>
            {statusLabel}
          </Link>
        </div>
      </div>

      <div
        className="innercard-container"
        id="riverlevel-contents"
        style={{ position: 'relative' }}
      > {/* //2 */}
        
        <div className="live-expected">
          <p>HOURLY PREDICTION</p>
          <h1
            style={{
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            {(Number(displayPredicted) || 0).toFixed(2)} ft.
          </h1>
        </div>
        
        <div className="live-current">
          <p>CURRENT</p>
          <h1
            style={{
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            {(Number(displayLevel) || 0).toFixed(2)} ft.
          </h1>
        </div>

        {/* //3 */}
        <ResponsiveContainer width="100%" height="100%">
          <Link to="/history" style={{ display: 'contents', textDecoration: 'none', color: 'inherit' }}>
            <BarChart
              data={chartData}
              barGap="-100%"
              barCategoryGap={0}
              margin={{ top: 20, bottom: 20, left: 0, right: 0 }}
            >
              <XAxis
                hide
                dataKey="time"
              />
              <YAxis
                hide
                domain={[0, 11]}
              />

              <Bar
                dataKey="predicted"
                fill="#abd9ff"
                isAnimationActive={false}
              />
              <Bar
                dataKey="current"
                fill="#002d5a"
                stroke="#002d5a"
                strokeWidth={1}
                isAnimationActive={false}
              />

              <ReferenceLine
                y={calibrate(displayPredicted)}
                stroke="#abd9ff"
                strokeWidth={3}
                strokeDasharray={displayPredicted < displayLevel ? '5 5' : '0'}
                strokeOpacity={displayPredicted === displayLevel ? 0 : 1}
              />
            </BarChart>
          </Link>
        </ResponsiveContainer>

        {/* //4 */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
{/* //5 */}
          <line
            x1="50%"
            y1={`${getVisualY(calibrate(displayLevel))}%`}
            x2="50%"
            y2={`${getVisualY(minLevel)}%`} 
            stroke="white"
            strokeOpacity="0.5"
            strokeWidth="2"
            strokeLinecap="butt"
          />
          <line
            x1="50%"
            y1={`${getVisualY(maxLevel)}%`} 
            x2="50%"
            y2={`${getVisualY(calibrate(displayLevel))}%`}
            stroke="black"
            strokeWidth="2"
            strokeLinecap="butt"
          />

{/* //4 SVG GAUGE OVERLAY */}
          {/* Multiply length by 2 to create steps of 0.5 instead of 1.0 */}
          {Array.from({ length: (maxLevel - minLevel) * 2 + 1 }).map((_, i) => {
            const val = maxLevel - (i * 0.5); // Step by 0.5
            const yPos = `${getVisualY(val)}%`;
            
            const isWhole = val % 1 === 0;
            const isEven = val % 2 === 0;

            const isSubmerged = displayLevel >= val;
            const activeColor = isSubmerged ? "white" : "black";
            const shadowColor = isSubmerged ? 'rgba(0,45,90,0.8)' : 'rgba(255,255,255,0.8)';

            // Determine tick width and length based on value type
            let x1 = "48.5%"; // Default for half-marks (shortest)
            let x2 = "51.5%";
            let strokeWidth = "1.5"; // Thinner for half-marks

            if (isWhole) {
              x1 = isEven ? "44%" : "47%"; // Longest for evens, medium for odds
              x2 = isEven ? "56%" : "53%";
              strokeWidth = "2.5"; // Thicker for whole numbers
            }

            return (
              <g key={val}>
                <line
                  x1={x1}
                  y1={yPos}
                  x2={x2}
                  y2={yPos}
                  stroke={activeColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                />
                
                {/* Label only the Even Whole Numbers */}
                {isEven && (
                  <text
                    x="59%"
                    y={yPos}
                    dy="6"
                    fontSize="18"
                    fontWeight="900"
                    fill={activeColor}
                    style={{
                      textShadow: `1px 1px 2px ${shadowColor}`,
                    }}
                  >
                    {val}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default RiverLevel;