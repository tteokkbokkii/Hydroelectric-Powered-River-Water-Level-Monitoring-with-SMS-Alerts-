import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

function RiverTrend({ history, readingInterval = 5 }) {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (!Array.isArray(history) || history.length === 0) {
      setChartData([]);
      return;
    }

    // 1. Sort safely, providing a fallback if time is missing
    const sorted = [...history].sort((a, b) => {
      const timeA = a.time || "";
      const timeB = b.time || "";
      return timeA.localeCompare(timeB);
    });
    
    // 2. Take the last 19 readings (newest)
    const last19 = sorted.slice(-19);
    const formatted = last19.map(item => {
      // Safely extract time, ignoring Python's literal "None" string
      let displayTime = item.time;
      if (item.rtc_time && item.rtc_time !== "None") {
        displayTime = item.rtc_time.split(' ')[1] || item.time;
      }
      if (!displayTime || displayTime === "None") {
        displayTime = "--:--"; 
      }

      // Instead of forcing 0 on invalid numbers, return null.
      const currentVal = (item.distance && item.distance !== "None") ? Number(item.distance) : null;
      const predictedVal = (item.predicted && item.predicted !== "None") ? Number(item.predicted) : null;

      return {
        time: displayTime,
        current: currentVal,
        predicted: predictedVal,
        isFuture: false // TAG: Identify these as historical points
      };
    });

    // 3. Add a future point safely using the latest reading
    const latest = formatted[formatted.length - 1];
    if (latest && latest.predicted !== null) {
      let futureTime = latest.time;

      // Only attempt to split and add minutes if it's a valid time string
      if (futureTime && futureTime.includes(':')) {
        const [hour, minute] = futureTime.split(':').map(Number);
        if (!isNaN(hour) && !isNaN(minute)) {
          let newHour = hour;
          let newMinute = minute + Number(readingInterval); 

          if (newMinute >= 60) {
            newHour = (newHour + Math.floor(newMinute / 60)) % 24;
            newMinute = newMinute % 60;
        }
          
          futureTime = `${newHour.toString().padStart(2,'0')}:${newMinute.toString().padStart(2,'0')}`;
        }
      }
      
      formatted.push({
        time: futureTime,
        current: null, 
        predicted: latest.predicted,
        isFuture: true // TAG: Identify this specifically as the future projection
      });
    }

    setChartData(formatted);
  }, [history, readingInterval]);

  return (
    <div className="card-container" id="rivertrend">
      <h2 className="card-title">RIVER TREND</h2>
      <div className="innercard-container" id='rivertrend-contents'>
        <ResponsiveContainer width="100%" height="100%">
          <Link to="/history" style={{ display: 'contents', textDecoration: 'none', color: 'inherit' }}>
            <LineChart
              data={chartData}
              margin={{ top: 30, right: 35, left: 30, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: '#666' }}
                tickMargin={15}
                axisLine={{ stroke: '#ccc' }}
              />
              <YAxis
                domain={[2, 27]}
                ticks={[3, 9, 12, 15, 21, 24, 27]}
                tick={{ fontSize: 11, fill: '#666' }}
                tickMargin={15}
                axisLine={{ stroke: '#ccc' }}
                tickFormatter={(value) => `${value} ft.`}
              />
              
              {/* UPDATED TOOLTIP */}
              <Tooltip
                labelFormatter={(label) => `time: ${label}`}
                formatter={(value, name, props) => {
                  if (name === 'current') return [`${(Number(value) || 0).toFixed(2)} ft.`, 'Actual'];
                  
                  // Check the tag we added to determine the label
                  const label = props.payload.isFuture 
                    ? `Predicted (+${readingInterval} min)` 
                    : 'Predicted';
                    
                  return [`${(Number(value) || 0).toFixed(2)} ft.`, label];
                }}
                contentStyle={{ borderRadius: '10px', border: '1px solid #ddd', padding: '10px', fontSize: '12px' }}
              />
              
              {/* UPDATED LEGEND */}
              <Legend
                verticalAlign='top'
                align='right'
                iconType='plainline'
                wrapperStyle={{ top: 10, right: 10, fontSize: '12px' }}
                formatter={(value) => value === 'current' ? 'Actual' : 'Predicted'}
              />
              
              <Line
                name="predicted"
                type="monotone"
                dataKey="predicted"
                stroke="#002D5A"
                strokeWidth={2}
                dot={{ r: 3, fill: '#fff', stroke: '#002D5A', strokeWidth: 2 }}
                isAnimationActive={false}
                connectNulls={true}
              />
              <Line
                name="current"
                type="monotone"
                dataKey="current"
                stroke="#ff8f00"
                strokeWidth={2}
                dot={{ r: 3, fill: '#fff', stroke: '#ff8f00', strokeWidth: 2 }}
                isAnimationActive={false}
                connectNulls={false}
              />
            </LineChart>
          </Link>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default RiverTrend;