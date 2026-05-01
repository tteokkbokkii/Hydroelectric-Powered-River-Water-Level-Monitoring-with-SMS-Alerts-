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
  const minLevel = 5;
  const maxLevel = 12;

  const displayLevel = currentLevel || 0;
  const displayPredicted = predictedHour || predictedLevel || 0;

  const [thresholds, setThresholds] = useState({ attention: 10.0, critical: 11.0 });

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then(res => res.json())
      .then(data => {
        setThresholds({
          attention: parseFloat(data.threshold_attention) || 10.0,
          critical: parseFloat(data.threshold_critical) || 11.0
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

  const getVisualY = (val) => ((maxLevel - val) / (maxLevel - minLevel)) * 80 + 10;

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
              margin={{ top: 0, bottom: 0, left: 0, right: 0 }}
            >
              <XAxis
                hide
                dataKey="time"
              />
              <YAxis
                hide
                domain={[4.125, 12.875]}
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
            y2="90%"
            stroke="white"
            strokeOpacity="0.5"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="50%"
            y1="10%"
            x2="50%"
            y2={`${getVisualY(calibrate(displayLevel))}%`}
            stroke="black"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {Array.from({ length: (maxLevel - minLevel) * 4 + 1 }).map((_, i) => {
            const val = maxLevel - (i * 0.25);
            const yPos = `${getVisualY(val)}%`;
            const isWhole = val % 1 === 0;
            const isHalf = val % 1 === 0.5;

            const isSubmerged = displayLevel >= val;
            const activeColor = isSubmerged ? "white" : "black";

            //6
            const shadowColor = isSubmerged ? 'rgba(0,45,90,0.8)' : 'rgba(255,255,255,0.8)';

            let xStart, xEnd;
            if (isWhole) {
              xStart = "45%";
              xEnd = "55%";
            } else if (isHalf) {
              xStart = "46.5%";
              xEnd = "53.5%";
            } else {
              xStart = "48%";
              xEnd = "52%";
            }

            return (
              <g key={val}>
                <line
                  x1={xStart}
                  y1={yPos}
                  x2={xEnd}
                  y2={yPos}
                  stroke={activeColor}
                  strokeWidth={isWhole ? '2.5' : '1.5'}
                  strokeLinecap="round"
                />
                {isWhole && (
                  <text
                    x="57%"
                    y={yPos}
                    dy="6"
                    fontSize="16"
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