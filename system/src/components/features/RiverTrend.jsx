import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import mqtt from 'mqtt';

function RiverTrend({ history }) {
  const [liveData, setLiveData] = useState([]);

  // 1. Load History from Database
  useEffect(() => {
    if (Array.isArray(history) && history.length > 0) {
      const formattedHistory = [...history].reverse().map(item => ({
        time: item.time || "--:--",
        current: Number(item.distance) || 0,
        predicted: Number(item.predicted) || 0
      }));
      setLiveData(formattedHistory.slice(-20)); 
    }
  }, [history]);

  // 2. MQTT Logic for real-time updates
  useEffect(() => {
    // Aligned with Raspberry Pi Hotspot IP and WebSocket port
    const client = mqtt.connect('ws://172.20.10.5:9001');

    client.on('connect', () => {
      client.subscribe('sensor/hulo/reading');
      console.log("Trend Component: MQTT Connected to 172.20.10.5");
    });

    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        const newPoint = {
          time: data.time || "--:--",
          current: Number(data.distance) || 0,
          predicted: Number(data.predicted) || 0
        };

        setLiveData((prev) => {
          const updated = [...prev, newPoint];
          return updated.slice(-20); 
        });
      } catch (e) {
        console.error("MQTT Trend Parse Error", e);
      }
    });

    return () => {
      if (client) client.end();
    };
  }, []);

  return (
    <div className="card-container" id="rivertrend">
      <h2 className="card-title">RIVER TREND</h2>
      <div className="innercard-container" id='rivertrend-contents'>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={liveData}
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
              domain={[5, 12]}
              ticks={[5, 6, 7, 8, 9, 10, 11, 12]}
              tick={{ fontSize: 11, fill: '#666' }}
              tickMargin={15}
              axisLine={{ stroke: '#ccc' }}
              tickFormatter={(value) => `${value} ft.`}
            />
            <Tooltip
              labelFormatter={(label) => `time: ${label}`}
              // ADDED SAFETY: Check if value exists before calling .toFixed()
              formatter={(value, name) => [
                `${(Number(value) || 0).toFixed(2)} ft.`, 
                name === 'current' ? 'Actual' : 'Predicted'
              ]}
              contentStyle={{ borderRadius: '10px', border: '1px solid #ddd', padding: '10px', fontSize: '12px' }}
            />
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
              stroke="#0072CE"
              strokeWidth={2}
              dot={{ r: 3, fill: '#fff', stroke: '#0072CE', strokeWidth: 2 }}
              isAnimationActive={false} 
            />
            <Line
              name="current"
              type="monotone"
              dataKey="current"
              stroke="#FFB800"
              strokeWidth={2}
              dot={{ r: 3, fill: '#fff', stroke: '#FFB800', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default RiverTrend;