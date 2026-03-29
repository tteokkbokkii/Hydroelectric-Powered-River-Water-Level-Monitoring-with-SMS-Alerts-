import React, { useState, useMemo, useRef, useEffect } from 'react';
import mqtt from 'mqtt';
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

// PrimeReact Styles
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

const HistoryTab = () => {
  const [activeTab, setActiveTab] = useState('ACTUAL READING');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allData, setAllData] = useState([]);

  const actualChartRef = useRef(null);
  const predictedChartRef = useRef(null);

  // 1. Fetch from your Laptop Flask API
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Updated to use the IP that worked in your browser
        const response = await fetch('http://172.20.10.7:5000/api/data');
        const result = await response.json();
        
        // Map database columns to the names used in this JSX
        const mappedData = result.map(item => ({
          date: item.date_recorded,    // "2026-03-30"
          time: item.time_recorded,    // "00:30:00"
          distance: item.distance_ft,  // 10.2
          predicted: item.predicted_level,
          range: item.range_status
        }));
        
        setAllData(mappedData);
      } catch (err) {
        console.error("History fetch error:", err);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 5000); 
    return () => clearInterval(interval);
  }, []);

  // 2. Filter data based on Calendar selection
  const filteredData = useMemo(() => {
    if (!selectedDate || allData.length === 0) return [];

    // Manually format date to YYYY-MM-DD to avoid UTC timezone shifts
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const searchStr = `${y}-${m}-${d}`;

    console.log("Filtering for:", searchStr);

    return allData
      .filter(item => item.date === searchStr)
      .sort((a, b) => a.time.localeCompare(b.time)); // Sort by time for the chart
  }, [allData, selectedDate]);

  // 3. PDF Export Logic
  const handleExportPDF = async () => {
    if (!selectedDate || filteredData.length === 0) return;

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const dateTitle = selectedDate.toLocaleDateString();

    pdf.setFontSize(16);
    pdf.text('Historical Water Level Data - Hulo Ferry Station', 14, 15);
    pdf.setFontSize(12);
    pdf.text(`Report Date: ${dateTitle}`, 14, 22);

    // Build Table
    const tableRows = filteredData.map(row => [
        row.time, 
        `${row.distance.toFixed(2)} ft.`, 
        row.range
    ]);

    autoTable(pdf, {
      head: [['TIMESTAMP', 'ELEVATION', 'STATUS']],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [0, 114, 206] }
    });

    // Capture Charts
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
    
    pdf.save(`Hulo_History_${searchStr}.pdf`);
  };

  return (
    <div className="main-content">
      <div className="card-wrapper" id="main-profile-card">
        <h1 className="card-heading">HISTORICAL DATA ARCHIVE</h1>

        <div className="tab-nav">
          <button className={`nav-item ${activeTab === 'ACTUAL READING' ? 'is-active' : ''}`} onClick={() => setActiveTab('ACTUAL READING')}>ACTUAL</button>
          <button className={`nav-item ${activeTab === 'PREDICTED READING' ? 'is-active' : ''}`} onClick={() => setActiveTab('PREDICTED READING')}>PREDICTED</button>
        </div>

        <div className="tab-panel content-padding">
          <div id='history-panel' style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
            <Calendar value={selectedDate} onChange={(e) => setSelectedDate(e.value)} dateFormat="mm/dd/yy" showIcon />
            <Button label="EXPORT PDF" icon="pi pi-file-pdf" onClick={handleExportPDF} disabled={filteredData.length === 0} />
          </div>

          <div className="columns-container" style={{ display: 'flex', gap: '20px', height: '400px' }}>
            {/* TABLE COLUMN */}
            <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
              <DataTable value={filteredData} scrollable scrollHeight="350px" size="small" emptyMessage="No data found for this date.">
                <Column field="time" header="TIME" sortable />
                <Column field="distance" header="VALUE" body={(row) => `${row.distance.toFixed(2)} ft.`} />
                <Column field="range" header="STATUS" />
              </DataTable>
            </div>

            {/* CHART COLUMN */}
            <div style={{ flex: 1.5, background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis domain={[5, 13]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey={activeTab === 'ACTUAL READING' ? "distance" : "predicted"} 
                    stroke={activeTab === 'ACTUAL READING' ? "#FFB800" : "#0072CE"} 
                    strokeWidth={3}
                    dot={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden PDF Capture Area */}
      <div style={{ position: 'absolute', left: '-9999px' }}>
        <div ref={actualChartRef} style={{ width: '1000px', height: '500px', background: 'white' }}>
            <h2 style={{ textAlign: 'center' }}>Actual Water Levels</h2>
            <ResponsiveContainer><LineChart data={filteredData}><Line dataKey="distance" stroke="#FFB800" /></LineChart></ResponsiveContainer>
        </div>
        <div ref={predictedChartRef} style={{ width: '1000px', height: '500px', background: 'white' }}>
            <h2 style={{ textAlign: 'center' }}>Predicted Water Levels</h2>
            <ResponsiveContainer><LineChart data={filteredData}><Line dataKey="predicted" stroke="#0072CE" /></LineChart></ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default HistoryTab;