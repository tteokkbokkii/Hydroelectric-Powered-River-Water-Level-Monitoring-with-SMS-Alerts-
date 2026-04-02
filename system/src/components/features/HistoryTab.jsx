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

const API_BASE = 'http://172.20.10.5:5000/api';

const HistoryTab = () => {
  const [activeTab, setActiveTab] = useState('ACTUAL');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allData, setAllData] = useState([]);

  const actualChartRef = useRef(null);
  const predictedChartRef = useRef(null);

  // Fetch history from Flask API
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_BASE}/history?date=${selectedDate.toISOString().slice(0,10)}`);
        const result = await response.json();
        if (Array.isArray(result)) {
          setAllData(result);
        } else {
          setAllData([]);
        }
      } catch (err) {
        console.error("History fetch error:", err);
        setAllData([]);
      }
    };
    fetchHistory();
  }, [selectedDate]);

  // No need to filter further – the API already returns data for the selected date
  const filteredData = useMemo(() => {
    return [...allData].sort((a, b) => a.time.localeCompare(b.time));
  }, [allData]);

  const tableData = filteredData.map(row => [
    row.time,
    `${(Number(row.distance) || 0).toFixed(2)} ft.`,
    row.range
  ]);

  const handleExportPDF = async () => {
    if (!selectedDate || filteredData.length === 0) return;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const dateTitle = selectedDate.toLocaleDateString();

    pdf.setFontSize(16);
    pdf.text('Historical Water Level Data - Hulo Ferry Station', 14, 15);
    pdf.setFontSize(12);
    pdf.text(`Report Date: ${dateTitle}`, 14, 22);

    autoTable(pdf, {
      head: [['TIMESTAMP', 'ELEVATION', 'STATUS']],
      body: tableData,
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
    <div className="main-content">
      <div className="card-wrapper" id="main-profile-card">
        <h1 className="card-heading">HISTORICAL DATA ARCHIVE</h1>

        <div className="tab-nav">
          <button className={`nav-item ${activeTab === 'ACTUAL' ? 'is-active' : ''}`} onClick={() => setActiveTab('ACTUAL')}>ACTUAL</button>
          <button className={`nav-item ${activeTab === 'PREDICTED' ? 'is-active' : ''}`} onClick={() => setActiveTab('PREDICTED')}>PREDICTED</button>
        </div>

        <div className="tab-panel content-padding">
          <div id='history-panel' style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
            <Calendar value={selectedDate} onChange={(e) => setSelectedDate(e.value)} dateFormat="mm/dd/yy" showIcon />
            <Button label="EXPORT PDF" icon="pi pi-file-pdf" onClick={handleExportPDF} disabled={filteredData.length === 0} />
          </div>

          <div className="columns-container" style={{ display: 'flex', gap: '20px', height: '400px' }}>
            <div style={{ flex: 1, border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
              <DataTable value={filteredData} scrollable scrollHeight="350px" size="small" emptyMessage="No data found for this date.">
                <Column field="time" header="TIME" sortable />
                <Column field="distance" header="VALUE" body={(row) => `${(Number(row.distance) || 0).toFixed(2)} ft.`} />
                <Column field="range" header="STATUS" />
              </DataTable>
            </div>

            <div style={{ flex: 1.5, background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis domain={[5, 13]} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(val) => `${(Number(val) || 0).toFixed(2)} ft.`} />
                  <Line type="monotone" dataKey={activeTab === 'ACTUAL' ? "distance" : "predicted"} stroke={activeTab === 'ACTUAL' ? "#FFB800" : "#0072CE"} strokeWidth={3} dot={true} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden PDF Capture Area */}
      <div style={{ position: 'absolute', left: '-9999px' }}>
        <div ref={actualChartRef} style={{ width: '1000px', height: '500px', background: 'white', padding: '20px' }}>
          <h2 style={{ textAlign: 'center', color: '#333' }}>Actual Water Levels</h2>
          <ResponsiveContainer>
            <LineChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[5, 13]} />
              <Line type="monotone" dataKey="distance" stroke="#FFB800" strokeWidth={4} dot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div ref={predictedChartRef} style={{ width: '1000px', height: '500px', background: 'white', padding: '20px' }}>
          <h2 style={{ textAlign: 'center', color: '#333' }}>Predicted Water Levels</h2>
          <ResponsiveContainer>
            <LineChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[5, 13]} />
              <Line type="monotone" dataKey="predicted" stroke="#0072CE" strokeWidth={4} dot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default HistoryTab;