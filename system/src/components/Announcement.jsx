import React, { useState, useEffect, useRef } from 'react';

const Announcement = () => {
  // ---------- State ----------
  const [message, setMessage] = useState('RIVER ELEVATION AT -- FT. | NORMAL');
  const [color, setColor] = useState('#ABD9FF');
  const [isScrolling, setIsScrolling] = useState(false);
  const textRef = useRef(null);
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const scrollPosRef = useRef(0);
  const directionRef = useRef(1);
  const maxOffsetRef = useRef(0);

  // ---------- Simulation state ----------
  const [waterLevel, setWaterLevel] = useState(6.5);           // feet
  const [thresholds, setThresholds] = useState({
    normal: 6.5,
    attention: 8.0,
    critical: 9.5
  });
  const [extraMessages, setExtraMessages] = useState([]);      // e.g. ['Power Loss', 'Sensor Disconnect']

  // Load thresholds from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sensorThresholds');
    if (saved) {
      setThresholds(JSON.parse(saved));
    }
  }, []);

  // Listen for localStorage changes (if thresholds are updated in SystemTab)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'sensorThresholds' && e.newValue) {
        setThresholds(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Helper to update announcement based on current waterLevel and thresholds
  const updateFromState = () => {
    // Determine range
    let range = 'NORMAL';
    if (waterLevel >= thresholds.critical) {
      range = 'HIGHLY CRITICAL';
    } else if (waterLevel >= thresholds.attention) {
      range = 'NEEDS ATTENTION';
    }
    updateAnnouncement(waterLevel, range, extraMessages);
  };

  // Main announcement updater
  const updateAnnouncement = (waterLevel, range, extraMessagesList) => {
    const mainText = `RIVER ELEVATION AT ${waterLevel.toFixed(2)} FT. | ${range}`;
    const fullText = extraMessagesList.length ? `${mainText} | ${extraMessagesList.join(' | ')}` : mainText;
    setMessage(fullText.toUpperCase());

    let newColor = '#ABD9FF';
    if (extraMessagesList.includes('Power Loss') ||
        extraMessagesList.includes('Sensor Disconnect') ||
        extraMessagesList.includes('Server Disconnect')) {
      newColor = '#ED2100';
    } else if (range === 'HIGHLY CRITICAL') {
      newColor = '#ED2100';
    } else if (range === 'NEEDS ATTENTION') {
      newColor = '#fffd74';
    } else {
      newColor = '#ABD9FF';
    }
    setColor(newColor);
  };

  // Update when any state changes
  useEffect(() => {
    updateFromState();
  }, [waterLevel, thresholds, extraMessages]);

  // ---------- Scrolling logic (same as before) ----------
  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    const checkOverflow = () => {
      const containerWidth = container.clientWidth;
      const textWidth = textEl.scrollWidth;

      if (textWidth > containerWidth && !isScrolling) {
        setIsScrolling(true);
        const maxOffset = textWidth - containerWidth;
        maxOffsetRef.current = maxOffset;
        scrollPosRef.current = 0;
        directionRef.current = 1;
        startAnimation();
      } else if (textWidth <= containerWidth && isScrolling) {
        setIsScrolling(false);
        cancelAnimationFrame(animationRef.current);
        textEl.style.transform = 'translateX(0)';
      }
    };

    const startAnimation = () => {
      const step = () => {
        if (!isScrolling) return;
        let newPos = scrollPosRef.current + directionRef.current * 1;
        const max = maxOffsetRef.current;
        if (newPos >= max) {
          newPos = max;
          directionRef.current = -1;
        } else if (newPos <= 0) {
          newPos = 0;
          directionRef.current = 1;
        }
        scrollPosRef.current = newPos;
        if (textRef.current) {
          textRef.current.style.transform = `translateX(-${newPos}px)`;
        }
        animationRef.current = requestAnimationFrame(step);
      };
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = requestAnimationFrame(step);
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => {
      window.removeEventListener('resize', checkOverflow);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [message, isScrolling]);

  // ---------- Control panel for local simulation ----------
  const [showControls, setShowControls] = useState(false);

  const togglePowerLoss = () => {
    setExtraMessages(prev =>
      prev.includes('Power Loss')
        ? prev.filter(m => m !== 'Power Loss')
        : [...prev, 'Power Loss']
    );
  };
  const toggleSensorDisconnect = () => {
    setExtraMessages(prev =>
      prev.includes('Sensor Disconnect')
        ? prev.filter(m => m !== 'Sensor Disconnect')
        : [...prev, 'Sensor Disconnect']
    );
  };
  const resetMessages = () => {
    setExtraMessages([]);
  };

  return (
    <>
      <div className="announcement-bar" style={{ backgroundColor: color }}>
        <div
          className="announcement-text-container"
          ref={containerRef}
          style={{ position: 'relative', overflow: 'hidden', whiteSpace: 'nowrap' }}
        >
          <p
            ref={textRef}
            style={{
              margin: 0,
              padding: '5.5px 0',
              textAlign: 'center',
              fontFamily: 'InterMedium',
              display: 'inline-block',
              whiteSpace: 'nowrap',
              transform: 'translateX(0)',
              transition: isScrolling ? 'none' : 'transform 0.2s ease',
            }}
          >
            {message}
          </p>
        </div>
      </div>

      {/* Floating control panel (only for local testing) */}
      <div
        style={{
          position: 'fixed',
          bottom: '70px',
          right: '10px',
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '10px',
          fontSize: '12px',
          zIndex: 9999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          fontFamily: 'InterMedium',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <strong>Announcement Simulator</strong>
          <button
            onClick={() => setShowControls(!showControls)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
          >
            {showControls ? '−' : '+'}
          </button>
        </div>
        {showControls && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ marginBottom: '8px' }}>
              <label>Water Level (ft): </label>
              <input
                type="number"
                step="0.1"
                value={waterLevel}
                onChange={(e) => setWaterLevel(parseFloat(e.target.value))}
                style={{ width: '80px', marginLeft: '5px' }}
              />
            </div>
            <div style={{ marginBottom: '5px' }}>
              <button onClick={togglePowerLoss} style={{ marginRight: '5px', padding: '2px 8px' }}>
                {extraMessages.includes('Power Loss') ? '✓ Power Loss' : 'Power Loss'}
              </button>
              <button onClick={toggleSensorDisconnect} style={{ marginRight: '5px', padding: '2px 8px' }}>
                {extraMessages.includes('Sensor Disconnect') ? '✓ Sensor Disconnect' : 'Sensor Disconnect'}
              </button>
              <button onClick={resetMessages} style={{ padding: '2px 8px' }}>Reset Extras</button>
            </div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
              Thresholds: Normal {thresholds.normal} | Attention {thresholds.attention} | Critical {thresholds.critical}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Announcement;