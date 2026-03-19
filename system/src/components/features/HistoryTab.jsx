import React, { useState, useMemo, useRef, useEffect } from 'react';
import mqtt from 'mqtt'; // 1. Added MQTT
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

const HistoryTab = () => {
  const [activeTab, setActiveTab] = useState('ACTUAL READING');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allData, setAllData] = useState([]);

  const actualChartRef = useRef(null);
  const predictedChartRef = useRef(null);

  useEffect(() => {
    // 2. Connect to the Pi via WebSockets
    const client = mqtt.connect('ws://192.168.100.97:9001');

    client.on('connect', () => {
      console.log('History Tab connected to MQTT');
      client.subscribe('home/tank/level');
    });

    client.on('message', (topic, message) => {
      const rawCm = parseFloat(message.toString());
      if (!isNaN(rawCm)) {
        const feet = rawCm / 30.48;
        const now = new Date();
        
        // Match the format your JSON used: YYYY-MM-DD
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toLocaleTimeString('en-GB', { hour12: false }).slice(0, 5);

        let status = "NORMAL";
        if (feet >= 11.5) status = "CRITICAL";
        else if (feet >= 9.0) status = "WARNING";

        const newEntry = {
          date: dateStr,
          time: timeStr,
          distance: feet,
          predicted: feet + 0.5, // Your 5-min forecast logic
          range: status
        };

        setAllData((prevData) => [...prevData, newEntry]);
      }
    });

    return () => { if (client) client.end(); };
  }, []);

  const filteredData = useMemo(() => {
    if (!selectedDate) return [];
    const selectedDateStr = selectedDate.toISOString().slice(0,10);
    return allData.filter(item => item.date === selectedDateStr);
  }, [allData, selectedDate]);

  const tableData = filteredData.map(row => [
    row.time,
    `${row.distance.toFixed(2)} ft.`,
    row.range
  ]);

  const handleExportPDF = async () => {
    if (!selectedDate || filteredData.length === 0) return;

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    pdf.setFontSize(16);
    pdf.text('Historical Water Level Data', 14, 15);
    pdf.setFontSize(12);
    pdf.text(`Date: ${selectedDate.toLocaleDateString()}`, 14, 22);

    autoTable(pdf, {
      head: [['TIMESTAMP', 'ELEVATION', 'STATUS']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185] },
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 30 }, 2: { cellWidth: 30 } }
    });

    const addChartToPDF = async (chartRef, title, dataKey, color) => {
      if (!chartRef.current) return;
      try {
        const canvas = await html2canvas(chartRef.current, {
          scale: 2, backgroundColor: '#ffffff', allowTaint: false,
          useCORS: true, logging: false, windowWidth: 800
        });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 260;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addPage();
        pdf.setFontSize(14);
        pdf.text(title, 14, 15);
        pdf.addImage(imgData, 'PNG', 14, 25, imgWidth, imgHeight);
      } catch (error) {
        console.error('Error capturing chart:', error);
      }
    };

    await addChartToPDF(actualChartRef, 'Actual Reading', 'distance', '#FFB800');
    await addChartToPDF(predictedChartRef, 'Predicted Reading (5‑min ahead)', 'predicted', '#0072CE');
    pdf.save(`water_level_${selectedDate.toISOString().slice(0,10)}.pdf`);
  };

  return (
    <div className="main-content">
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
            onClick={() => setActiveTab('PREDICTED READING')}
          >
            PREDICTED READING
          </button>
        </div>

        <div className="tab-panel content-padding">
          <div className="panel-content-area">
            <div id='history-panel'>
              <div className='calendar-history'>
                <span className='calendar-span'>DATE:</span>
                <Calendar
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.value)}
                  dateFormat="mm/dd/yy"
                  showIcon
                />
              </div>
              <Button
                className='export-bttn'
                label="EXPORT TO PDF"
                icon="pi pi-file-pdf"
                onClick={handleExportPDF}
                disabled={!filteredData.length}
              />
            </div>

            <div className="columns-container">
              <div className="content-column" id='history-column1'>
                <DataTable value={filteredData} showGridlines size="small" scrollable scrollHeight="flex">
                  <Column field="time" header="TIMESTAMP" sortable />
                  <Column field="distance" header="ELEVATION" body={(rowData) => `${rowData.distance.toFixed(2)} ft.`} sortable />
                  <Column field="range" header="STATUS" />
                </DataTable>
              </div>

              <div className="content-column" id='history-column2'>
                <div className='chart-wrapper'>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredData} margin={{ top: 15, right: 30, left: 25, bottom: 35 }}>
                      <CartesianGrid stroke="#f0f0f0" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 8 }}
                        ticks={["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"]}
                        label={{ value: 'time (t)', position: 'insideBottom', offset: -15, style: { fontStyle: 'italic', fontSize: '10px' } }}
                      />
                      <YAxis
                        domain={[5, 12]}
                        ticks={[6, 7, 8, 9, 10, 11, 12]}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => `${v} ft.`}
                        label={{ value: 'water level (ft.)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontStyle: 'italic', fontSize: '10px' } }}
                      />
                      <Tooltip
                        cursor={{ stroke: '#ccc', strokeWidth: 1 }}
                        labelFormatter={(value) => `time: ${value}`}
                        formatter={(value) => [`${value} ft.`, "level"]}
                      />
                      <Line
                        type="monotone"
                        dataKey={activeTab === 'ACTUAL READING' ? "distance" : "predicted"}
                        stroke={activeTab === 'ACTUAL READING' ? "#FFB800" : "#0072CE"}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className='graph-footer'>
                  {activeTab === 'ACTUAL READING' ? 'Actual Reading' : 'Predicted Reading (5‑min ahead)'} for {selectedDate.toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bottom-spacer"></div>
      </div>

      {/* Hidden charts for PDF export */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={actualChartRef} style={{ width: '800px', height: '400px', background: 'white', padding: '20px' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Actual Reading - {selectedDate?.toLocaleDateString()}</h3>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={filteredData} margin={{ top: 15, right: 30, left: 25, bottom: 35 }}>
              <CartesianGrid stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize:10 }} ticks={["00:00","04:00","08:00","12:00","16:00","20:00","24:00"]} label={{ value: 'time (t)', position: 'insideBottom', offset: -10 }} />
              <YAxis domain={[5,12]} ticks={[6,7,8,9,10,11,12]} tick={{ fontSize:10 }} tickFormatter={(v)=>`${v} ft.`} label={{ value: 'water level (ft.)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Line type="monotone" dataKey="distance" stroke="#FFB800" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div ref={predictedChartRef} style={{ width: '800px', height: '400px', background: 'white', padding: '20px', marginTop: '20px' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Predicted Reading (5‑min ahead) - {selectedDate?.toLocaleDateString()}</h3>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={filteredData} margin={{ top: 15, right: 30, left: 25, bottom: 35 }}>
              <CartesianGrid stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize:10 }} ticks={["00:00","04:00","08:00","12:00","16:00","20:00","24:00"]} label={{ value: 'time (t)', position: 'insideBottom', offset: -10 }} />
              <YAxis domain={[5,12]} ticks={[6,7,8,9,10,11,12]} tick={{ fontSize:10 }} tickFormatter={(v)=>`${v} ft.`} label={{ value: 'water level (ft.)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Line type="monotone" dataKey="predicted" stroke="#0072CE" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default HistoryTab;