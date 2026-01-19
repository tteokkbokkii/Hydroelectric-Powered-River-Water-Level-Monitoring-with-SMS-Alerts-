import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';

import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

const generateStaticConstantData = () => {
  const result = [];
  const dates = ['2026-01-19', '2026-01-20'];
  dates.forEach((dateString, dayIndex) => {
    for (let i = 0; i < 288; i++) {
      const h = Math.floor((i * 5) / 60).toString().padStart(2, '0');
      const m = ((i * 5) % 60).toString().padStart(2, '0');
      let val = dayIndex === 0 
        ? 6 + (i / 288) * 5 + Math.sin(i / 10) * 0.15 
        : 11 - (i / 288) * 4 + Math.cos(i / 10) * 0.15;
      result.push({ 
        date: dateString, 
        time: `${h}:${m}`, 
        current: parseFloat(val.toFixed(2)), 
        status: 'NORMAL' 
      });
    }
    result.push({ date: dateString, time: '24:00', current: result[result.length-1].current, status: 'NORMAL' });
  });
  return result;
};

const STATIC_DATA = generateStaticConstantData();

const HistoryTab = () => {
  const [activeTab, setActiveTab] = useState('ACTUAL READING');
  const [selectedDate, setSelectedDate] = useState(new Date('2026-01-19'));

  const filteredData = useMemo(() => {
    return STATIC_DATA.filter(item => {
      const itemDateStr = new Date(item.date).toDateString();
      const searchDateStr = selectedDate ? selectedDate.toDateString() : '';
      return itemDateStr === searchDateStr;
    });
  }, [selectedDate]);

  const renderContent = (lineColor) => (
    <div className="panel-content-area">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>DATE:</span>
          <Calendar value={selectedDate} onChange={(e) => setSelectedDate(e.value)} dateFormat="mm/dd/yy" showIcon />
        </div>
        <Button label="EXPORT TO PDF" icon="pi pi-file-pdf" style={{ background: '#0072CE', border: 'none' }} />
      </div>

      <div className="columns-container">
        {/* Left Column: Table fills available height automatically */}
        <div className="content-column column-1" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <DataTable 
            value={filteredData} 
            showGridlines 
            size="small" 
            scrollable 
            scrollHeight="flex" 
            style={{ flex: 1 }}
          >
            <Column field="time" header="TIMESTAMP" sortable />
            <Column field="current" header="ELEVATION" body={(rowData) => `${rowData.current.toFixed(2)} ft.`} sortable />
            <Column field="status" header="STATUS" />
          </DataTable>
        </div>

        {/* Right Column: Graph fits available height */}
        <div className="content-column column-2" style={{ flex: 1.5, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData} margin={{ top: 20, right: 35, left: 30, bottom: 40 }}>
                <CartesianGrid stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={11} label={{ value: 'time (t)', position: 'insideBottom', offset: -20, style: { fontStyle: 'italic', fontSize: '12px' } }} />
                <YAxis domain={[5, 12]} ticks={[6, 7, 8, 9, 10, 11, 12]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v} ft.`} label={{ value: 'water level (ft.)', angle: -90, position: 'insideLeft', style: { fontStyle: 'italic', fontSize: '12px' } }} />
                <Tooltip />
                <Line type="monotone" dataKey="current" stroke={lineColor} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ textAlign: 'center', marginTop: '5px', fontSize: '13px', color: '#666', fontStyle: 'italic', flexShrink: 0 }}>
            {activeTab === 'ACTUAL READING' ? 'Actual Reading' : 'Predicted Reading'} for {selectedDate.toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="card-wrapper" id="main-profile-card">
      <h1 className="card-heading">HISTORICAL WATER LEVEL DATA OF HULO FERRY STATION</h1>      
      <div className="tab-nav">
        <button className={`nav-item ${activeTab === 'ACTUAL READING' ? 'is-active' : ''}`} onClick={() => setActiveTab('ACTUAL READING')}>ACTUAL READING</button>
        <button className={`nav-item ${activeTab === 'PREDICTION' ? 'is-active' : ''}`} onClick={() => setActiveTab('PREDICTION')}>PREDICTED READING</button>
      </div>
      <div className="tab-panel">
        {activeTab === 'ACTUAL READING' && renderContent("#FFB800")}
        {activeTab === 'PREDICTION' && renderContent("#0072CE")}
      </div>
    </div>
  );
};

export default HistoryTab;