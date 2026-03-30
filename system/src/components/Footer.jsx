import React, { useState, useEffect } from 'react';

const Footer = () => {
  const [signalBars, setSignalBars] = useState(3);
  const [systemStatus, setSystemStatus] = useState('NORMAL');

  useEffect(() => {
    const handleStatusChange = (event) => {
      const { powerLoss, sensorDisconnect } = event.detail;
      const issues = [];
      if (powerLoss) issues.push('POWER LOSS');
      if (sensorDisconnect) issues.push('SENSOR DISCONNECT');

      let displayText = 'NORMAL';
      if (issues.length > 0) {
        displayText = issues.join(' | ');
      }
      setSystemStatus(displayText);
    };
    window.addEventListener('footerStatusChange', handleStatusChange);
    return () => window.removeEventListener('footerStatusChange', handleStatusChange);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newBars = Math.floor(Math.random() * 5);
      setSignalBars(newBars);
    }, 15000);
    return () => clearInterval(interval);
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