import React, { useState, useEffect } from 'react';
import mqtt from 'mqtt';

const MQTT_BROKER = 'ws://192.168.100.97:9001';

const Footer = () => {
  const [signalBars, setSignalBars] = useState(0);
  const [systemStatus, setSystemStatus] = useState('NORMAL');

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
          if (issues.length > 0) {
            displayText = issues.join(' | ');
          }

          setSystemStatus(displayText);
        } catch (e) {
          console.error('Failed to parse system status:', message.toString());
        }
      }
    });

    return () => {
      if (client) client.end();
    };
  }, []);

  const renderBars = () => {
    const heights = [6, 12, 18, 24];
    const bars = [];
    for (let i = 0; i < 4; i++) {
      const isActive = i < signalBars;
      bars.push(
        <div
          key={i}
          className={`signal-bar ${isActive ? 'active' : ''}`}
          style={{
            width: '4px',
            height: `${heights[i]}px`,
            marginLeft: '2px',
            backgroundColor: isActive ? '#0072CE' : '#a0a0a0',
            transition: 'background-color 0.2s',
            borderRadius: '2px',
          }}
        />
      );
    }
    return bars;
  };

  const isNormal = systemStatus === 'NORMAL';
  const badgeColor = isNormal ? '#0072CE' : '#ED2100';
  const badgeBg = isNormal ? '#e6f2ff' : '#ffe6e6';
  const badgeBorder = isNormal ? '#0072CE' : '#ED2100';

  return (
    <footer className='footer-container'>
      <div className='system-status'>
        <div
          className='status-badge'
          style={{
            backgroundColor: badgeBg,
            borderColor: badgeBorder,
          }}
        >
          <span className='status-label' style={{ color: badgeColor }}>
            CONNECTIONS:{' '}
          </span>
          <span className='status-value' style={{ color: badgeColor, fontWeight: 'bold' }}>
            {systemStatus}
          </span>
        </div>
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