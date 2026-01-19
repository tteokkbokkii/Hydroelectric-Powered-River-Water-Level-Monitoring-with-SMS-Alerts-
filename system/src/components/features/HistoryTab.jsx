import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';

import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

const data = [
  { date: '2026-01-19', time: '00:00', current: 6.2, status: 'NORMAL' },
  { date: '2026-01-19', time: '08:00', current: 9.0, status: 'WARNING' },
  { date: '2026-01-19', time: '23:00', current: 12.0, status: 'CRITICAL' },
  { date: '2026-01-20', time: '00:00', current: 10.1, status: 'WARNING' },
  { date: '2026-01-20', time: '12:00', current: 6.5, status: 'NORMAL' }
];

const HistoryTab = () => {
  const [activeTab, setActiveTab] = useState('ACTUAL READING');
  const [selectedDate, setSelectedDate] = useState(new Date('2026-01-19'));

  // Logic: Filters data for BOTH Table and Graph
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const itemDate = new Date(item.date).toDateString();
      const searchDate = selectedDate ? selectedDate.toDateString() : '';
      return itemDate === searchDate;
    });
  }, [selectedDate]);

  // Helper to render the shared layout (Table + Graph) with dynamic color
  const renderContent = (lineColor) => (
    <div className="panel-content-area">
      {/* Date Picker Row inside the panel */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontWeight: 'bold' }}>DATE:</span>
          <Calendar 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.value)} 
            dateFormat="mm/dd/yy" 
            showIcon 
          />
        </div>
        <Button label="EXPORT TO PDF" icon="pi pi-file-pdf" style={{ background: '#0072CE', border: 'none' }} />
      </div>

      <div className="columns-container" style={{ display: 'flex', gap: '20px' }}>
        {/* PANEL 1: Table */}
        <div className="content-column column-1" style={{ flex: 1 }}>
          <DataTable value={filteredData} showGridlines size="small" emptyMessage="No data found.">
            <Column field="time" header="TIMESTAMP" />
            <Column field="current" header="ELEVATION" body={(r) => `${r.current.toFixed(2)} ft.`} />
            <Column field="status" header="STATUS" />
          </DataTable>
        </div>

        {/* PANEL 2: Chart with Dynamic Color */}
        <div className="content-column column-2" style={{ flex: 1, height: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData}>
              <CartesianGrid vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis domain={[5, 13]} tickFormatter={(v) => `${v} ft.`} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="current" 
                stroke={lineColor} 
                strokeWidth={3} 
                dot={{ r: 4, fill: lineColor }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  return (
    <div className="card-wrapper" id="main-profile-card" style={{ padding: '20px' }}>
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
        {activeTab === 'ACTUAL READING' && renderContent("#FFB800")}
        {activeTab === 'PREDICTION' && renderContent("#0072CE")}
      </div>
    </div>
  );
};

export default HistoryTab;