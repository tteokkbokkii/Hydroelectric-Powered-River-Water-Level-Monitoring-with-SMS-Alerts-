import React, { useState, useEffect } from 'react';
import mqtt from 'mqtt';

const MQTT_BROKER = 'ws://192.168.43.154:9001';

const Footer = () => {
  const [signalBars, setSignalBars] = useState(0);
  const [systemStatus, setSystemStatus] = useState('NORMAL');
  const [statusColor, setStatusColor] = useState('#0072CE');

  useEffect(() => {
    const client = mqtt.connect(MQTT_BROKER);
    client.on('connect', () => {
      console.log('Footer connected to MQTT');
      client.subscribe('system/signal');
      client.subscribe('system/status');
    });

    client.on('message', (topic, message) => {
      if (topic === 'system/signal') {
        try {
          const data = JSON.parse(message.toString());
          setSignalBars(data.bars);
        } catch (e) {
          console.error('Failed to parse signal message:', message.toString());
        }
      } else if (topic === 'system/status') {
        try {
          const status = JSON.parse(message.toString());
          const issues = [];

          if (status.reset_reason === 'POWER_ON') issues.push('POWER LOSS');
          if (!status.ultrasonic_connected || !status.float_connected) issues.push('SENSOR DISCONNECT');

          let displayText = 'NORMAL';
          let color = '#0072CE';
          if (issues.length > 0) {
            displayText = issues.join(' | ');
            color = '#ED2100';
          }

          setSystemStatus(displayText);
          setStatusColor(color);
        } catch (e) {
          console.error('Failed to parse system status:', message.toString());
        }
      }
    });

    return () => {
      if (client) client.end();
    };
  }, []);

  // Render signal bars (blue active, gray inactive)
  const renderBars = () => {
    const bars = [];
    for (let i = 0; i < 4; i++) {
      const isActive = i < signalBars;
      bars.push(
        <div
          key={i}
          className={`signal-bar ${isActive ? 'active' : ''}`}
          style={{
            width: '4px',
            height: `${6 + i * 2}px`,
            marginLeft: '2px',
            backgroundColor: isActive ? '#0072CE' : '#a0a0a0',
            transition: 'background-color 0.2s',
          }}
        />
      );
    }
    return bars;
  };

  return (
    <footer className='footer-container'>
      <div className='system-status'>
        <p>SYSTEM STATUS: <span style={{ color: statusColor, fontWeight: 'bold' }}>{systemStatus}</span></p>
      </div>
      <div className='signal-container'>
        <div className="signal-bars-container">
          {renderBars()}
        </div>
      </div>
    </footer>
  );
};

export default Footer;