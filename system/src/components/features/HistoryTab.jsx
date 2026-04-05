import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

const currentIP = window.location.hostname || 'hulo.local';
const API_BASE = `http://${currentIP}:5000/api`;
const POLL_INTERVAL = 30000; // 30 seconds

const HistoryTab = () => {
  const [activeTab, setActiveTab] = useState('ACTUAL');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Settings State to compute predicted times and status
  const [settings, setSettings] = useState({
    normal: 6.5, attention: 8.0, critical: 9.5, predicting_interval: 60
  });

  const actualChartRef = useRef(null);
  const predictedChartRef = useRef(null);
  const scrollPositionRef = useRef(0);
  const tableWrapperRef = useRef(null);

  // ---------- Fetch Settings ----------
  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then(res => res.json())
      .then(data => {
        setSettings({
          normal: data.threshold_normal,
          attention: data.threshold_attention,
          critical: data.threshold_critical,
          predicting_interval: data.predicting_interval
        });
      })
      .catch(err => console.error("Error fetching settings:", err));
  }, []);

  const getLocalDateStr = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const saveScrollPosition = () => {
    if (tableWrapperRef.current) {
      const scrollableDiv = tableWrapperRef.current.querySelector('.p-datatable-scrollable-body');
      if (scrollableDiv) {
        scrollPositionRef.current = scrollableDiv.scrollTop;
      }
    }
  };

  const restoreScrollPosition = () => {
    if (tableWrapperRef.current && scrollPositionRef.current > 0) {
      const scrollableDiv = tableWrapperRef.current.querySelector('.p-datatable-scrollable-body');
      if (scrollableDiv) {
        setTimeout(() => {
          scrollableDiv.scrollTop = scrollPositionRef.current;
        }, 50);
      }
    }
  };

  const fetchHistory = async () => {
    const dateStr = getLocalDateStr(selectedDate);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/history?date=${dateStr}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (Array.isArray(result)) {
        setAllData(result);
      } else {
        setAllData([]);
      }
    } catch (err) {
      console.error("History fetch error:", err);
      setError(err.message);
      setAllData([]);
    } finally {
      setLoading(false);
      restoreScrollPosition();
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(() => {
      saveScrollPosition();
      fetchHistory();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [selectedDate]);

  // ---------- Dynamic Data Processing ----------
  const { actualData, predictedData } = useMemo(() => {
    const sorted = [...allData].sort((a, b) => a.time.localeCompare(b.time));
    
    const actuals = [];
    const predicteds = [];

    sorted.forEach(row => {
      // 1. Map Actual Data
      actuals.push({
        ...row,
        displayTime: row.time,
        displayValue: row.distance,
        displayStatus: row.range
      });

      // 2. Map Predicted Data
      let predTimeStr = "--:--";
      if (row.time) {
        const [hours, minutes, seconds] = row.time.split(':').map(Number);
        const d = new Date();
        d.setHours(hours, minutes, seconds || 0);
        d.setMinutes(d.getMinutes() + settings.predicting_interval); // Add the system interval
        predTimeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds() || 0).padStart(2, '0')}`;
      }
      
      const predVal = Number(row.predicted) || 0;
      let predStatus = "SAFE";
      if (predVal >= settings.critical) predStatus = "CRITICAL";
      else if (predVal >= settings.attention) predStatus = "WARNING";

      predicteds.push({
        ...row,
        displayTime: predTimeStr,
        displayValue: row.predicted,
        displayStatus: predStatus
      });
    });

    return { actualData: actuals, predictedData: predicteds };
  }, [allData, settings]);

  // Determine which dataset to show based on the active tab
  const activeDisplayData = activeTab === 'ACTUAL' ? actualData : predictedData;

  const tableDataForPdf = activeDisplayData.map(row => [
    row.displayTime,
    `${(Number(row.displayValue) || 0).toFixed(2)} ft.`,
    row.displayStatus
  ]);

  const handleExportPDF = async () => {
    if (!selectedDate || activeDisplayData.length === 0) return;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const dateTitle = selectedDate.toLocaleDateString();

    pdf.setFontSize(16);
    pdf.text('Historical Water Level Data - Hulo Ferry Station', 14, 15);
    pdf.setFontSize(12);
    pdf.text(`Report Date: ${dateTitle}`, 14, 22);

    autoTable(pdf, {
      head: [['TIMESTAMP', 'ELEVATION', 'STATUS']],
      body: tableDataForPdf,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [0, 114, 206] }
    });

    const addChart = async (ref, title) => {
      if (!ref.current) return;
      const canvas = await html2canvas(ref.current, { scale: 2 });
      const img = canvas.toDataURL('image/png');
      pdf.addPage();
      pdf.text(title, 14, 15);
      pdf.addImage(img, 'PNG', 10, 25, 270, 130);
    };

    await addChart(actualChartRef, `Actual Readings - ${dateTitle}`);
    await addChart(predictedChartRef, `Predicted Readings - ${dateTitle}`);
    pdf.save(`Hulo_History_${dateTitle.replace(/\//g, '-')}.pdf`);
  };

  return (
    <div className="history-page-wrapper">
      <div className="card-wrapper" id="main-profile-card">
        <h1 className="card-heading">HISTORICAL DATA ARCHIVE</h1>

        <div className="tab-nav">
          <button className={`nav-item ${activeTab === 'ACTUAL' ? 'is-active' : ''}`} onClick={() => setActiveTab('ACTUAL')}>ACTUAL</button>
          <button className={`nav-item ${activeTab === 'PREDICTED' ? 'is-active' : ''}`} onClick={() => setActiveTab('PREDICTED')}>PREDICTED</button>
        </div>

        <div className="tab-panel content-padding">
          <div id='history-panel' style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
            <Calendar value={selectedDate} onChange={(e) => setSelectedDate(e.value)} dateFormat="mm/dd/yy" showIcon />
            <Button label="EXPORT PDF" icon="pi pi-file-pdf" onClick={handleExportPDF} disabled={activeDisplayData.length === 0} />
          </div>

          <div className="columns-container">
            <div className="content-column" id="history-column1" ref={tableWrapperRef}>
              {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}
              {error && <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>Error: {error}</div>}
              {!loading && !error && (
                <DataTable value={activeDisplayData} scrollable scrollHeight="flex" responsiveLayout="stack" breakpoint="1024px" size="small" emptyMessage="No data found for this date.">
                  <Column field="displayTime" header="TIME" sortable />
                  <Column field="displayValue" header="VALUE" body={(row) => `${(Number(row.displayValue) || 0).toFixed(2)} ft.`} />
                  <Column field="displayStatus" header="STATUS" />
                </DataTable>
              )}
            </div>

            <div className="content-column" id="history-column2">
              <div className='chart-wrapper'>
                <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                  <LineChart data={activeDisplayData} margin={{ top: 15, right: 30, left: 25, bottom: 35 }}>
                    <CartesianGrid stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="displayTime" 
                      tick={{ fontSize: 8 }} 
                      ticks={["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"]}
                      label={{ value: 'time (t)', position: 'insideBottom', offset: -15, style: { fontStyle: 'italic', fontSize: '10px' } }}
                    />
                    <YAxis 
                      domain={[2, 13]} 
                      ticks={[2, 4, 6, 8, 10, 12]} 
                      tick={{ fontSize: 10 }} 
                      tickFormatter={(v) => `${v} ft.`}
                      label={{ value: 'water level (ft.)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontStyle: 'italic', fontSize: '10px' } }}
                    />
                    <Tooltip cursor={{ stroke: '#ccc', strokeWidth: 1 }} labelFormatter={(value) => `time: ${value}`} formatter={(value) => [`${(Number(value) || 0).toFixed(2)} ft.`, "level"]} />
                    <Line 
                      type="monotone" 
                      dataKey="displayValue" 
                      stroke={activeTab === 'ACTUAL' ? "#FFB800" : "#0072CE"} 
                      strokeWidth={2} 
                      dot={false} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className='graph-footer'>
                {activeTab === 'ACTUAL' ? 'Actual Reading' : 'Predicted Reading'} for {selectedDate.toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden PDF Capture Area */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        
        {/* Actual Graph Capture */}
        <div ref={actualChartRef} style={{ width: '800px', height: '400px', background: 'white', padding: '20px' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Actual Reading - {selectedDate?.toLocaleDateString()}</h3>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={actualData} margin={{ top: 15, right: 30, left: 25, bottom: 35 }}>
              <CartesianGrid stroke="#f0f0f0" />
              <XAxis dataKey="displayTime" tick={{ fontSize:10 }} ticks={["00:00","04:00","08:00","12:00","16:00","20:00","24:00"]} label={{ value: 'time (t)', position: 'insideBottom', offset: -10 }} />
              <YAxis domain={[2,13]} ticks={[2,4,6,8,10,12]} tick={{ fontSize:10 }} tickFormatter={(v)=>`${v} ft.`} label={{ value: 'water level (ft.)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Line type="monotone" dataKey="displayValue" stroke="#FFB800" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Predicted Graph Capture */}
        <div ref={predictedChartRef} style={{ width: '800px', height: '400px', background: 'white', padding: '20px', marginTop: '20px' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Predicted Reading - {selectedDate?.toLocaleDateString()}</h3>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={predictedData} margin={{ top: 15, right: 30, left: 25, bottom: 35 }}>
              <CartesianGrid stroke="#f0f0f0" />
              <XAxis dataKey="displayTime" tick={{ fontSize:10 }} ticks={["00:00","04:00","08:00","12:00","16:00","20:00","24:00"]} label={{ value: 'time (t)', position: 'insideBottom', offset: -10 }} />
              <YAxis domain={[2,13]} ticks={[2,4,6,8,10,12]} tick={{ fontSize:10 }} tickFormatter={(v)=>`${v} ft.`} label={{ value: 'water level (ft.)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Line type="monotone" dataKey="displayValue" stroke="#0072CE" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
};

export default HistoryTab;