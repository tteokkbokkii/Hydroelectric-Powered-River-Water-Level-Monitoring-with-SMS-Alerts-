import React, { useState, useEffect } from 'react';
import mqtt from 'mqtt';
const App = () => {
  const [sensors, setSensors] = useState([
    {
      id: "HULO_01",
      name: "Hulo Ferry Station",
      type: "JSN-SR04T Ultrasonic Sensor (Main)",
      level: 0,
      predicted: 0,
      status: "WAITING"
    },
    {
      id: "HSR_02",
      name: "HSR Station B",
      type: "HR-SR04 Ultrasonic Sensor",
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
      client.subscribe('sensor/hulo/reading'); 
      client.subscribe('system/status');
      client.subscribe('system/signal');
    });

    client.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());

        // Process the combined payload from your ESP32
        if (topic === 'sensor/hulo/reading') {
          setSensors(prev => prev.map(sensor => {
            
            // Map distance1 and range1 to the Main Hulo Sensor
            if (sensor.id === "HULO_01") {
              const currentLevel1 = payload.distance1 != null ? payload.distance1 : sensor.level;
              return {
                ...sensor,
                level: currentLevel1,
                predicted: currentLevel1 > 0 ? currentLevel1 + 0.5 : 0,
                status: payload.range1 ?? sensor.status
              };
            }
            
            if (sensor.id === "HSR_02") {
              const currentLevel2 = payload.distance2 != null ? payload.distance2 : sensor.level;
              return {
                ...sensor,
                level: currentLevel2,
                predicted: currentLevel2 > 0 ? currentLevel2 + 0.5 : 0,
                status: payload.range2 ?? sensor.status
              };
            }

            return sensor; // Return any other sensors unchanged
          }));
        }
      } catch (e) {
        console.error('Failed to parse MQTT message', topic, e);
      }
    });

    return () => {
      try { client.end(); } catch (e)
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

export default App;

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