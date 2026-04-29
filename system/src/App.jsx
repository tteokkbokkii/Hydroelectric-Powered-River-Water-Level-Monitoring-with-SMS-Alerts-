import React, { useState, useEffect } from 'react';
import mqtt from 'mqtt';
const TestPage = () => {
  // Initialized to 0 as requested
  const [sensors, setSensors] = useState([
    {
      id: "HULO_01",
      name: "Hulo Ferry Station",
      type: "Ultrasonic (Main)",
      level: 0,
      predicted: 0,
      status: "WAITING"
    },
    {
      id: "HSR_02",
      name: "HSR Station B",
      type: "HSR Ultrasonic",
      level: 0,
      predicted: 0,
      status: "WAITING"
    }
  ]);

  useEffect(() => {
    const currentIP = window.location.hostname || 'rivermonitoring.local';
    const MQTT_BROKER = `ws://${currentIP}:9001`;
    const client = mqtt.connect(MQTT_BROKER);

    client.on('connect', () => {
      console.log('TestPage connected to MQTT');
      client.subscribe('sensor/+/reading');
      client.subscribe('system/status');
      client.subscribe('system/signal');
    });

    client.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());

        if (topic.startsWith('sensor/')) {
          const parts = topic.split('/');
          const key = parts[1] || 'unknown'; 
          const prefix = key.toUpperCase();

          setSensors(prev => {
            const idx = prev.findIndex(s => s.id.startsWith(prefix));
            
            // FUNCTIONALITY: Level is payload or 0. Predicted is level + 0.5.
            const currentLevel = payload.distance != null ? payload.distance : 0;
            const simplifiedPrediction = currentLevel > 0 ? currentLevel + 0.5 : 0;

            if (idx !== -1) {
              return prev.map(s => s.id === prev[idx].id ? {
                ...s,
                level: currentLevel,
                predicted: simplifiedPrediction,
                status: payload.range ?? s.status
              } : s);
            }

            const newSensor = {
              id: `${prefix}_01`,
              name: `${key.charAt(0).toUpperCase() + key.slice(1)} Station`,
              type: 'Ultrasonic',
              level: currentLevel,
              predicted: simplifiedPrediction,
              status: payload.range ?? 'UNKNOWN'
            };
            return [newSensor, ...prev];
          });
        }
      } catch (e) {
        console.error('Failed to parse MQTT message', topic, e);
      }
    });

    return () => {
      try { client.end(); } catch (e) { /* ignore */ }
    };
  }, []);

  return (
    <div style={{ padding: '20px', backgroundColor: '#F4F4F4', minHeight: '100vh', color: '#002D5A' }}>
      <header style={{ borderBottom: '1px solid #eef2f6', marginBottom: '20px' }}>
        <h1>Scalability Test Dashboard</h1>
        <p style={{ color: '#555' }}>Confirms that React accommodates additional components with minimal changes.</p>
      </header>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '20px' 
      }}>
        
        {sensors.map((sensor) => (
          <div key={sensor.id} style={{
            backgroundColor: '#ffffff',
            padding: '20px',
            borderRadius: '10px',
            borderLeft: `10px solid ${sensor.status === 'CRITICAL' ? '#ED2100' : '#10b981'}`
          }}>
            <h2 style={{ margin: '0 0 10px 0' }}>{sensor.name}</h2>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>Device ID: {sensor.id} | {sensor.type}</p>
            <hr style={{ borderColor: '#eef2f6' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
              <div>
                <span style={{ display: 'block', color: '#888' }}>Current Level</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {sensor.level != null ? `${sensor.level.toFixed(2)} ft` : '0.00 ft'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', color: '#888' }}>Predicted (+5m)</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0056b3' }}>
                  {sensor.predicted != null ? `${sensor.predicted.toFixed(2)} ft` : '0.00 ft'}
                </span>
              </div>
            </div>

            <div style={{ 
              marginTop: '20px', 
              padding: '5px 10px', 
              borderRadius: '5px', 
              textAlign: 'center',
              backgroundColor: sensor.status === 'CRITICAL' ? 'rgba(237,33,0,0.08)' : 'rgba(16,185,129,0.06)',
              color: sensor.status === 'CRITICAL' ? '#ED2100' : '#10b981',
              fontWeight: 'bold'
            }}>
              STATUS: {sensor.status}
            </div>
          </div>
        ))}

      </div>
      
      <footer style={{ marginTop: '30px', fontSize: '0.8rem', color: '#555' }}>
        Scalability Test Page
      </footer>
    </div>
  );
};

export default TestPage;

/*
import {HashRouter as Router, Routes, Route} from 'react-router-dom'
import GlobalStateProvider from './components/features/GlobalStateProvider.jsx';
import Contacts from './pages/Contacts'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import System from './pages/System'
// import HandshakeCheck from './components/HandshakeCheck.jsx';
import TestPage from './pages/TestPage.jsx';

function App() {
    return (
        <>
            <Router>
                <GlobalStateProvider>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path='/Dashboard' element={<Dashboard/>}/>
                        <Route path='/Contacts' element={<Contacts/>}/>
                        <Route path='/History' element={<History/>}/>
                        <Route path='/System' element={<System/>}/>
                        <Route path='/TestPage' element={<TestPage/>}/>
                    </Routes>
                </GlobalStateProvider>
            </Router>
            {
                //<HandshakeCheck/>
            }
        </>
    );
}


export default App; 
*/