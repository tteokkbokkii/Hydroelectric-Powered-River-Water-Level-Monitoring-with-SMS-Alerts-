import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import mqtt from 'mqtt'; // 1. Added MQTT import

function RiverTrend() {
  const [data, setData] = useState([]);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-GB', { hour12: false });
  };

  useEffect(() => {
    // 2. Connect to the same Pi WebSocket
    const client = mqtt.connect('ws://192.168.100.97:9001');

    client.on('connect', () => {
      console.log('Trend Component Connected to MQTT');
      client.subscribe('home/tank/level');
    });

    client.on('message', (topic, message) => {
      const rawCm = parseFloat(message.toString());
      if (!isNaN(rawCm)) {
        const feet = rawCm / 30.48;
        const timeStr = formatTime(new Date());

        setData((prevData) => {
          // Create the new data point
          const newPoint = {
            time: timeStr,
            current: parseFloat(feet.toFixed(2)),
            predicted: parseFloat((feet + 0.5).toFixed(2)) // Using your +0.5 logic
          };

          // Keep only the last 20 points so the graph doesn't get too crowded
          const updatedData = [...prevData, newPoint];
          if (updatedData.length > 20) {
            return updatedData.slice(-20);
          }
          return updatedData;
        });
      }
    });

    return () => { if (client) client.end(); };
  }, []);

  // --- EVERYTHING BELOW IS YOUR ORIGINAL UI - UNCHANGED ---
  return (
    <div className="card-container" id="rivertrend">
      <h2 className="card-title">RIVER TREND</h2>
      <div className="innercard-container" id='rivertrend-contents'>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 30, right: 35, left: 30, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: '#666' }}
              tickMargin={15}
              axisLine={{ stroke: '#ccc' }}
              label={{ value: 'time (hrs)', position: 'insideBottom', offset: -20, style: { fontStyle: 'italic', fontSize: '11px', fill: '#999' } }}
            />
            <YAxis
              domain={[5, 12]}
              ticks={[5, 6, 7, 8, 9, 10, 11, 12]}
              tick={{ fontSize: 11, fill: '#666' }}
              tickMargin={15}
              axisLine={{ stroke: '#ccc' }}
              tickFormatter={(value) => `${value} ft.`}
              label={{ value: 'water level (ft.)', angle: -90, position: 'insideLeft', offset: -10, style: { fontStyle: 'italic', textAnchor: 'middle', fontSize: '11px', fill: '#999' } }}
            />
            <Tooltip
              labelFormatter={(label) => `time: ${label}`}
              formatter={(value, name) => [`${value} ft.`, name === 'current' ? 'Actual' : 'Predicted']}
              contentStyle={{ borderRadius: '10px', border: '1px solid #ddd', padding: '10px', fontSize:'12px' }}
              itemStyle={{ padding: '2px 0' }}
            />
            <Legend
              verticalAlign='top'
              align='right'
              iconType='plainline'
              wrapperStyle={{ top: 20, right: 10, fontSize: '12px' }}
              formatter={(value) => value === 'current' ? 'Actual' : 'Predicted'}
            />
            <Line
              name="predicted"
              type="monotone"
              dataKey="predicted"
              stroke="#0072CE"
              strokeWidth={2}
              dot={{ r: 4, fill: '#fff', stroke: '#0072CE', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
              connectNulls={true}
            />
            <Line
              name="current"
              type="monotone"
              dataKey="current"
              stroke="#FFB800"
              strokeWidth={2}
              connectNulls={false}
              dot={{ r: 4, fill: '#fff', stroke: '#FFB800', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default RiverTrend;