import React, { useState, useEffect } from 'react';

const Footer = () => {
  const [signalBars, setSignalBars] = useState(3);
  const [systemStatus, setSystemStatus] = useState('NORMAL');
  const [statusColor, setStatusColor] = useState('#0072CE');

  // Listen for status changes from Announcement
  useEffect(() => {
    const handleStatusChange = (event) => {
      const { powerLoss, sensorDisconnect } = event.detail;
      const issues = [];
      if (powerLoss) issues.push('POWER LOSS');
      if (sensorDisconnect) issues.push('SENSOR DISCONNECT');

      let displayText = 'NORMAL';
      let color = '#0072CE';
      if (issues.length > 0) {
        displayText = issues.join(' | ');
        color = '#ED2100';
      }
      setSystemStatus(displayText);
      setStatusColor(color);
    };
    window.addEventListener('footerStatusChange', handleStatusChange);
    return () => window.removeEventListener('footerStatusChange', handleStatusChange);
  }, []);

  // Simulate signal strength changes (random)
  useEffect(() => {
    const interval = setInterval(() => {
      const newBars = Math.floor(Math.random() * 5);
      setSignalBars(newBars);
    }, 15000);
    return () => clearInterval(interval);
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