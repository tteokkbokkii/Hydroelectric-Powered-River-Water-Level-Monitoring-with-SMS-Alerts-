import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

function RiverTrend() {
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-GB', { hour12: false });
  };

  const generateInitialData = () => {
    const dataPoints = [];
    const now = new Date();
    for (let i = 19; i >= 0; i--) {
      const d = new Date(now.getTime() - (i - 1) * 1000); 
      const timeStr = formatTime(d);
      
      dataPoints.push({
        time: timeStr,
        current: i === 0 ? null : Number((6.5 + Math.random() * 0.5).toFixed(2)),
        predicted: Number((6.8 + Math.random() * 0.3).toFixed(2))
      });
    }
    return dataPoints;
  };

  const [data, setData] = useState(generateInitialData());

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + 1000); 
      
      const timeNowStr = formatTime(now);
      const timeFutureStr = formatTime(futureTime);
      
      setData(prevData => {
        const updatedData = [...prevData];
        const lastIndex = updatedData.length - 1;
        
        updatedData[lastIndex] = {
          ...updatedData[lastIndex],
          current: Number((6.5 + Math.random() * 0.5).toFixed(2))
        };

        const newFuturePoint = {
          time: timeFutureStr,
          current: null, 
          predicted: Number((6.8 + Math.random() * 0.3).toFixed(2))
        };

        return [...updatedData.slice(1), newFuturePoint];
      });
    }, 1000);

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
              formatter={(value, name) => [`${value} ft.`, name]}
              contentStyle={{ 
                  borderRadius: '10px', 
                  border: '1px solid #ddd',
                  padding: '10px',
                  fontSize:'12px' 
              }}
              itemStyle={{padding: '2px 0' }}
            />
            
            <Legend
              verticalAlign='top'
              align='right'
              iconType='plainline'
              wrapperStyle={{ top: 20, right: 10, fontSize: '12px' }}
            />
            
            <Line 
              name="predicted"
              type="monotone" 
              dataKey="predicted" 
              stroke="#0072CE" 
              strokeWidth={2} 
              dot={{ r: 4, fill: '#fff', stroke: '#0072CE', strokeWidth: 2 }}
              activeDot={{ r: 6 }} 
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