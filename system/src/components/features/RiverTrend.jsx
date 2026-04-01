import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import mqtt from 'mqtt';

function RiverTrend({ history }) {
  const [liveData, setLiveData] = useState([]);

  // 1. Load History from Database when the Dashboard fetches it
  useEffect(() => {
    if (history && history.length > 0) {
      // Map unified database keys (distance, time, predicted) to the chart keys
      // We .reverse() so newest data is on the right of the line chart
      const formattedHistory = [...history].reverse().map(item => ({
        time: item.time,
        current: item.distance,
        predicted: item.predicted
      }));
      setLiveData(formattedHistory.slice(-20)); // Limit to last 20 data points
    }
  }, [history]);

  // 2. MQTT Logic for real-time line updates
  useEffect(() => {
    // Aligned with Raspberry Pi Hotspot IP and WebSocket port
    const client = mqtt.connect('ws://192.168.43.154:9001');

    client.on('connect', () => {
      client.subscribe('sensor/hulo/reading');
      console.log("Trend Component: MQTT Connected");
    });

    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        const newPoint = {
          time: data.time,
          current: data.distance,
          predicted: data.predicted
        };

        setLiveData((prev) => {
          const updated = [...prev, newPoint];
          return updated.slice(-20); // Maintain a moving window of 20 points
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
              label={{ 
                value: 'time (hrs)', 
                position: 'insideBottom', 
                offset: -20, 
                style: { fontStyle: 'italic', fontSize: '11px', fill: '#999' } 
              }}
            />
            <YAxis
              domain={[5, 12]}
              ticks={[5, 6, 7, 8, 9, 10, 11, 12]}
              tick={{ fontSize: 11, fill: '#666' }}
              tickMargin={15}
              axisLine={{ stroke: '#ccc' }}
              tickFormatter={(value) => `${value} ft.`}
              label={{ 
                value: 'water level (ft.)', 
                angle: -90, 
                position: 'insideLeft', 
                offset: -10, 
                style: { fontStyle: 'italic', textAnchor: 'middle', fontSize: '11px', fill: '#999' } 
              }}
            />
            <Tooltip
              labelFormatter={(label) => `time: ${label}`}
              formatter={(value, name) => [`${value.toFixed(2)} ft.`, name === 'current' ? 'Actual' : 'Predicted']}
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
              activeDot={{ r: 5 }}
              isAnimationActive={false} 
            />
            <Line
              name="current"
              type="monotone"
              dataKey="current"
              stroke="#FFB800"
              strokeWidth={2}
              dot={{ r: 3, fill: '#fff', stroke: '#FFB800', strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default RiverTrend;