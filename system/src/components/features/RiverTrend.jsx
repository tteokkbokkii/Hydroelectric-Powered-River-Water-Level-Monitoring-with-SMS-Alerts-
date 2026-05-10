import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';

const currentIP = window.location.hostname || 'rivermonitoring.local';
const API_BASE = `http://${currentIP}:5000/api`;

function RiverTrend({ history, readingInterval }) {
  const [chartData, setChartData] = useState([]);
  
  const [settings, setSettings] = useState({
    normal: 8.0, attention: 10.0, critical: 12.0
  });

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then(res => res.json())
      .then(data => {
        setSettings({
          normal: data.threshold_normal,
          attention: data.threshold_attention,
          critical: data.threshold_critical
        });
      })
      .catch(err => console.error("Error fetching settings:", err));
  }, []);

  useEffect(() => {
    if (!Array.isArray(history) || history.length === 0) {
      setChartData([]);
      return;
    }

    const sorted = [...history].sort((a, b) => {
      const timeStrA = (a.rtc_time && a.rtc_time !== "None") ? a.rtc_time : (a.time || "");
      const timeStrB = (b.rtc_time && b.rtc_time !== "None") ? b.rtc_time : (b.time || "");

      const dateA = new Date(timeStrA).getTime();
      const dateB = new Date(timeStrB).getTime();

      if (isNaN(dateA) || isNaN(dateB)) {
        return timeStrA.localeCompare(timeStrB);
      }

      return dateA - dateB;
    });
    
    const last19 = sorted.slice(-19);
    const formatted = last19.map(item => {
      let displayTime = item.time;
      if (item.rtc_time && item.rtc_time !== "None") {
        displayTime = item.rtc_time.split(' ')[1] || item.time;
      }
      if (!displayTime || displayTime === "None") {
        displayTime = "--:--"; 
      }

      const currentVal = (item.distance && item.distance !== "None") ? Number(item.distance) : null;
      const predictedVal = (item.predicted && item.predicted !== "None") ? Number(item.predicted) : null;

      return {
        time: displayTime,
        current: currentVal,
        predicted: predictedVal,
        isFuture: false 
      };
    });

    const latest = formatted[formatted.length - 1];
    if (latest && latest.predicted !== null) {
      let futureTime = latest.time;
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
        isFuture: true 
      });
    }

    setChartData(formatted);
  }, [history, readingInterval]);

  const { minY, maxY, dynamicTicks } = useMemo(() => {
    const dataValues = chartData
      .flatMap(d => [d.current, d.predicted])
      .filter(val => val !== null && !isNaN(val));

    // Calculate minimum
    const dataMin = dataValues.length > 0 ? Math.min(...dataValues) : 10;
    const lowestPoint = Math.floor(Math.min(dataMin, settings.normal));
    const finalMin = Math.max(0, lowestPoint - 1);
    
    // Calculate maximum: Highest between Critical Setting and actual Data, plus 1
    const dataMax = dataValues.length > 0 ? Math.max(...dataValues) : 26;
    const absoluteHighest = Math.max(settings.critical, dataMax);
    const finalMax = Math.ceil(absoluteHighest) + 1;
    
    const ticks = [];
    
    // Generate ticks in exact increments of 1 foot
    for (let i = finalMin; i <= finalMax; i += 1) {
      ticks.push(i);
    }
    
    return { minY: finalMin, maxY: finalMax, dynamicTicks: ticks };
  }, [chartData, settings]);

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
                width={60}                  
                domain={[minY, maxY]}       
                ticks={dynamicTicks}        
                tick={{ fontSize: 11, fill: '#666' }}
                tickMargin={15}
                axisLine={{ stroke: '#ccc' }}
                tickFormatter={(value) => `${value} ft.`}
                allowDataOverflow={true} 
              />
              
              <Tooltip
                labelFormatter={(label) => `time: ${label}`}
                formatter={(value, name, props) => {
                  if (name === 'current') return [`${(Number(value) || 0).toFixed(2)} ft.`, 'Actual'];
                  
                  const label = props.payload.isFuture 
                    ? `Predicted (+${readingInterval} min)` 
                    : 'Predicted';
                    
                  return [`${(Number(value) || 0).toFixed(2)} ft.`, label];
                }}
                contentStyle={{ borderRadius: '10px', border: '1px solid #ddd', padding: '10px', fontSize: '12px' }}
              />
              
              <Legend
                verticalAlign='top'
                align='right'
                iconType='plainline'
                wrapperStyle={{ top: 10, right: 10, fontSize: '12px' }}
                formatter={(value) => value === 'current' ? 'Actual' : 'Predicted'}
              />

              {settings.normal > 0 && (
                <ReferenceLine y={settings.normal} stroke="#28a745" strokeDasharray="3 3" label={{ position: 'top', value: 'Normal', fontSize: 10, fill: '#28a745' }} />
              )}
              {settings.attention > 0 && (
                <ReferenceLine y={settings.attention} stroke="#ffc107" strokeDasharray="3 3" label={{ position: 'top', value: 'Attention', fontSize: 10, fill: '#ffc107' }} />
              )}
              {settings.critical > 0 && (
                <ReferenceLine y={settings.critical} stroke="#dc3545" strokeDasharray="3 3" label={{ position: 'top', value: 'Critical', fontSize: 10, fill: '#dc3545' }} />
              )}
              
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