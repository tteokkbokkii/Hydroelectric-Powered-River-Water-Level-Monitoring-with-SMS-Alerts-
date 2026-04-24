import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

function RiverTrend({ history }) {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (!Array.isArray(history) || history.length === 0) {
      setChartData([]);
      return;
    }

    // Sort history by time (ascending) so oldest first, newest last
    const sorted = [...history].sort((a, b) => a.time.localeCompare(b.time));
    
    // Take the last 19 readings (newest)
    const last19 = sorted.slice(-19);
    const formatted = last19.map(item => ({
      time: item.rtc_time ? item.rtc_time.split(' ')[1] : item.time
      current: Number(item.distance) || 0,
      predicted: Number(item.predicted) || 0
    }));

    // Add a future point using the latest reading (the last element in sorted)
    const latest = sorted[sorted.length - 1];
    if (latest && latest.predicted) {
      // Compute future time (+5 minutes)
      let futureTime = latest.time;
      if (latest.time) {
        const [hour, minute] = latest.time.split(':').map(Number);
        let newHour = hour;
        let newMinute = minute + 5;
        if (newMinute >= 60) {
          newHour += 1;
          newMinute -= 60;
        }
        if (newHour >= 24) newHour = 0;
        futureTime = `${newHour.toString().padStart(2,'0')}:${newMinute.toString().padStart(2,'0')}`;
      }
      formatted.push({
        time: futureTime,
        current: null,
        predicted: Number(latest.predicted)
      });
    }

    setChartData(formatted);
  }, [history]);

  return (
    <div className="card-container" id="rivertrend">
      <h2 className="card-title">RIVER TREND</h2>
      <div className="innercard-container" id='rivertrend-contents'>
        <ResponsiveContainer width="100%" height="100%">
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
              domain={[5, 12]}
              ticks={[5, 6, 7, 8, 9, 10, 11, 12]}
              tick={{ fontSize: 11, fill: '#666' }}
              tickMargin={15}
              axisLine={{ stroke: '#ccc' }}
              tickFormatter={(value) => `${value} ft.`}
            />
            <Tooltip
              labelFormatter={(label) => `time: ${label}`}
              formatter={(value, name) => [`${(Number(value) || 0).toFixed(2)} ft.`, name === 'current' ? 'Actual' : 'Predicted']}
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
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default RiverTrend;