import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

function RiverTrend() {
  const [data, setData] = useState([]);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-GB', { hour12: false });
  };

  const updateData = async () => {
    try {
      const response = await fetch('/monitorData.json');
      const allData = await response.json();

      if (allData.length === 0) return;

      // Take the last 20 readings (instead of 19) so we have enough points
      const last20 = allData.slice(-20);

      // Build chart data: each point gets current (actual) and predicted
      const chartData = last20.map(entry => ({
        time: entry.time,
        current: entry.distance,
        predicted: entry.predicted   // forecast for 5 minutes after this reading
      }));

      // Add a future point to extend the predicted line by one step
      const latest = allData[allData.length - 1];
      const [hour, minute, second] = latest.time.split(':').map(Number);
      const latestDate = new Date();
      latestDate.setHours(hour, minute, second);
      const futureDate = new Date(latestDate.getTime() + 5 * 60000); // +5 min
      const futureTimeStr = formatTime(futureDate);

      chartData.push({
        time: futureTimeStr,
        current: null,
        predicted: latest.predicted   // this prediction is already for this future time
      });

      setData(chartData);
    } catch (error) {
      console.error('Error fetching trend data:', error);
    }
  };

  useEffect(() => {
    updateData();
    const interval = setInterval(updateData, 5000);
    return () => clearInterval(interval);
  }, []);

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