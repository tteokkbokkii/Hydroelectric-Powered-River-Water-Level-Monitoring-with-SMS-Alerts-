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
          <LineChart data={data}
            margin={{ top: 50, right: 50, left: 60, bottom: 70 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
                dataKey="time"
                tickMargin={15}
                label={{value: 'time (hrs)',
                    position:'insideBottom',
                    offset:-35,
                    style:{fontStyle:'italic'}
                }}
            />
            <YAxis
                domain={[5, 12]}
                tickMargin={15}
                ticks={[5, 6, 7, 8, 9, 10, 11, 12]}
                tickFormatter={(value) => `${value} ft.`}
                label={{ value: 'water Level (ft', 
                    angle: -90, 
                    position: 'insideLeft',
                    offset:-25,
                    style:{fontStyle:'italic', textAnchor:'middle'}
                }}
            />
            <Tooltip 
            labelFormatter={(label) => `time: ${label}`} 
                formatter={(value, name) => [`${value} ft.`, name]}
                contentStyle={{ 
                    borderRadius: '10px', 
                    border: '1px solid #ddd',
                    padding: '10px' 
                }}
                itemStyle={{ padding: '2px 0' }}
            />
            <Legend
                verticalAlign='top'
                align='right'
                iconType='plainline'
                wrapperStyle={{ paddingBottom: '30px' }}
            />
            <Line 
              type="monotone" 
              dataKey="predicted" 
              stroke="#0072CE" 
              strokeWidth={2} 
              dot={{ r: 4 }}
            />
            
            <Line 
              type="monotone" 
              dataKey="current" 
              stroke="#FFB800" 
              strokeWidth={2} 
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default RiverTrend;