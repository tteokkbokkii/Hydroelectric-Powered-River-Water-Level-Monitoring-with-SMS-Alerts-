import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const data = [
  { time: '07:00', current: 6.8, predicted: 7.0 },
  { time: '08:00', current: 6.7, predicted: 6.7 },
  { time: '09:00', current: 6.8, predicted: 7.0 },
  { time: '10:00', current: 7.2, predicted: 7.5 },
  { time: '11:00', current: 6.7, predicted: 6.9 },
  { time: '12:00', current: 6.5, predicted: 6.5 },
  { time: '13:00', current: 6.3, predicted: 6.3 },
  { time: '14:00', current: null, predicted: 7.0 }, 
];

function RiverTrend() {
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