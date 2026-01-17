import React, { useState } from 'react';
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
  { time: '00:00', current: 6.2 },
  { time: '01:00', current: 6.5 },
  { time: '02:00', current: 6.7 },
  { time: '03:00', current: 7.0 },
  { time: '04:00', current: 7.1 },
  { time: '05:00', current: 7.3 },
  { time: '06:00', current: 7.5 },
  { time: '07:00', current: 8.8 },
  { time: '08:00', current: 9.0 },
  { time: '09:00', current: 8.8 },
  { time: '10:00', current: 10.0 },
  { time: '11:00', current: 10.1 },
  { time: '12:00', current: 10.2 },
  { time: '13:00', current: 9.8 },
  { time: '14:00', current: 9.5 },
  { time: '15:00', current: 9.5 },
  { time: '16:00', current: 9.2 },
  { time: '17:00', current: 9.0 },
  { time: '18:00', current: 9.1 },
  { time: '19:00', current: 7.8 },
  { time: '20:00', current: 6.5 },
  { time: '21:00', current: 10.5 },
  { time: '22:00', current: 11.0 },
  { time: '23:00', current: 12.0 },
  { time: '24:00', current: 10.1 },
];

const HistoryTab = () => {
  const [activeTab, setActiveTab] = useState('ACTUAL READING');

  return (
    <div className="card-wrapper" id="main-profile-card">
      <h1 className="card-heading">HISTORICAL WATER LEVEL DATA OF HULO FERRY STATION</h1>      
        <div className="tab-nav">
          <button 
            className={`nav-item ${activeTab === 'ACTUAL READING' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('ACTUAL READING')}
          >
            ACTUAL READING
          </button>
          <button 
            className={`nav-item ${activeTab === 'PREDICTION' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('PREDICTION')}
          >
            PREDICTED READING
          </button>
        </div>

        <div className="tab-panel">
          {activeTab === 'ACTUAL READING' && (
            <div className="panel-content-area" id="ACTUAL READING-section">
              
              <div className="columns-container">
                
                {/* PANEL 1 */}
                <div className="content-column column-1">
                  <p id='table'>Lorem ipsum dolor sit amet consectetur adipisicing elit. Expedita, laboriosam soluta! Voluptatibus dicta est accusamus fugit architecto qui aliquam cum. Voluptate possimus aut vel pariatur optio minus soluta velit ex.</p>
                </div>

                {/* PANEL 2 */}
                <div className="content-column column-2" id='history-actual'>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={data}
                      margin={{ top: 30, right: 35, left: 30, bottom: 40 }}
                    >
                      <CartesianGrid vertical={false} stroke="#f0f0f0" />
                      
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fontFamily: 'InterRegular' }}
                        tickMargin={6} 
                        label={{
                          value: 'time (t)',
                          position: 'insideBottom', 
                          offset: -20, 
                          style: { 
                            fontStyle: 'italic', 
                            fontSize: '12px', 
                            fontFamily: 'InterRegular',
                            textAnchor: 'middle' 
                          }
                        }}
                      />
                      
                      <YAxis
                        domain={[5, 12]} 
                        ticks={[6, 7, 8, 9, 10, 11, 12]}
                        tick={{ fontSize: 10, fontFamily: 'InterRegular' }}
                        tickMargin={7}   
                        tickFormatter={(value) => `${value} ft.`}
                        label={{ 
                          value: 'water level (ft.)', 
                          angle: -90, 
                          position: 'insideLeft',
                          offset: 0,
                          style: { fontStyle: 'italic', textAnchor: 'middle', fontSize: '12px', fontFamily: 'InterRegular' }
                        }}
                      />
                      
                      <Tooltip 
                        labelFormatter={(label) => `time: ${label}`}
                    
                        formatter={(value) => [`${value} ft.`, 'reading']}
                        
                        contentStyle={{ 
                          borderRadius: '4px', 
                          fontFamily: 'InterRegular', 
                          fontSize: '12px',
                          border: '1px solid #ccc' 
                        }}
                        itemStyle={{ padding: '0px' }}
                      />
                      
                      <Line 
                        name="current"
                        type="monotone" 
                        dataKey="current" 
                        stroke="#FFB800" 
                        strokeWidth={2} 
                        dot={{ r: 4, fill: '#FFB800', stroke: '#fff', strokeWidth: 1 }} 
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'PREDICTION' && (
            <div className="panel-content-area" id="PREDICTION-section">
             <div className="columns-container">
                
                {/* PANEL 1 */}
                <div className="content-column column-1">
                  <p id='table'>Lorem ipsum dolor sit amet consectetur adipisicing elit. Expedita, laboriosam soluta! Voluptatibus dicta est accusamus fugit architecto qui aliquam cum. Voluptate possimus aut vel pariatur optio minus soluta velit ex.</p>
                </div>

                {/* PANEL 2 */}
                <div className="content-column column-2" id='history-actual'>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={data}
                      margin={{ top: 30, right: 35, left: 30, bottom: 40 }}
                    >
                      <CartesianGrid vertical={false} stroke="#f0f0f0" />
                      
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fontFamily: 'InterRegular' }}
                        tickMargin={6} 
                        label={{
                          value: 'time (t)',
                          position: 'insideBottom', 
                          offset: -20, 
                          style: { 
                            fontStyle: 'italic', 
                            fontSize: '12px', 
                            fontFamily: 'InterRegular',
                            textAnchor: 'middle' 
                          }
                        }}
                      />
                      
                      <YAxis
                        domain={[5, 12]} 
                        ticks={[6, 7, 8, 9, 10, 11, 12]}
                        tick={{ fontSize: 10, fontFamily: 'InterRegular' }}
                        tickMargin={7}   
                        tickFormatter={(value) => `${value} ft.`}
                        label={{ 
                          value: 'water level (ft.)', 
                          angle: -90, 
                          position: 'insideLeft',
                          offset: 0,
                          style: { fontStyle: 'italic', textAnchor: 'middle', fontSize: '12px', fontFamily: 'InterRegular' }
                        }}
                      />
                      
                      <Tooltip 
                        labelFormatter={(label) => `time: ${label}`}
                    
                        formatter={(value) => [`${value} ft.`, 'reading']}
                        
                        contentStyle={{ 
                          borderRadius: '4px', 
                          fontFamily: 'InterRegular', 
                          fontSize: '12px',
                          border: '1px solid #ccc' 
                        }}
                        itemStyle={{ padding: '0px' }}
                      />
                      
                      <Line 
                        name="current"
                        type="monotone" 
                        dataKey="current" 
                        stroke="#0072CE" 
                        strokeWidth={2} 
                        dot={{ r: 4, fill: '#0072CE', stroke: '#fff', strokeWidth: 1 }} 
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  );
};

export default HistoryTab;