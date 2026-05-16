import React, { useState, useEffect, useRef } from 'react';
import mqtt from 'mqtt';

const currentIP = window.location.hostname || 'rivermonitoring.local';
const MQTT_BROKER = `ws://${currentIP}:9001`;
const API_BASE = `http://${currentIP}:5000/api`; // Added API Base

const Announcement = () => {
  // Load saved water level and thresholds from localStorage
  const [waterLevel, setWaterLevel] = useState(() => {
    const saved = localStorage.getItem('announcement_waterLevel');
    return saved ? parseFloat(saved) : 0;
  });
  const [thresholds, setThresholds] = useState(() => {
    const saved = localStorage.getItem('announcement_thresholds');
    return saved ? JSON.parse(saved) : { normal: 1.3, attention: 3.3, critical: 5.3 };
  });

  const [message, setMessage] = useState('RIVER ELEVATION AT -- FT. | NORMAL');
  const [color, setColor] = useState('#ABD9FF');
  const [isScrolling, setIsScrolling] = useState(false);
  const textRef = useRef(null);
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const scrollPosRef = useRef(0);
  const directionRef = useRef(1);
  const maxOffsetRef = useRef(0);

    useEffect(() => {
        fetch(`${API_BASE}/settings`)
          .then(res => res.json())
          .then(data => {
            setThresholds({
              normal: parseFloat(data.threshold_normal) || 1.3,
              attention: parseFloat(data.threshold_attention) || 3.3,
              critical: parseFloat(data.threshold_critical) || 5.3
            });
          })
          .catch(err => console.error('Error fetching settings:', err));
      }, []);

    
    // --- NEW: Instant API Fetch on Load ---
    // This ensures the announcement bar doesn't have to wait for the next MQTT ping to show the correct data
    useEffect(() => {
      const fetchInitialData = async () => {
        try {
          const response = await fetch(`${API_BASE}/data`);
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const newest = data[0]; // Newest reading based on your database sorting
            if (newest && newest.distance !== undefined) {
              setWaterLevel(newest.distance);
            }
          }
        } catch (error) {
          console.error('Announcement API fetch error:', error);
        }
      };
      fetchInitialData();
    }, []);
    
  // Helper to update the announcement text and color
  const updateAnnouncement = () => {
    let range = 'NORMAL';
    if (waterLevel >= thresholds.critical) {
      range = 'HIGHLY CRITICAL';
    } else if (waterLevel >= thresholds.attention) {
      range = 'NEEDS ATTENTION';
    }
    const mainText = `RIVER ELEVATION AT ${(parseFloat(waterLevel) || 0).toFixed(2)} FT. | ${range}`;
    setMessage(mainText.toUpperCase());

    let newColor = '#ABD9FF';
    if (range === 'HIGHLY CRITICAL') {
      newColor = '#ff7676';
    } else if (range === 'NEEDS ATTENTION') {
      newColor = '#ffc074';
    } 
    setColor(newColor);
  };

  // Save water level and thresholds to localStorage when they change
  useEffect(() => {
    if (waterLevel !== 0) localStorage.setItem('announcement_waterLevel', waterLevel);
  }, [waterLevel]);
  useEffect(() => {
    localStorage.setItem('announcement_thresholds', JSON.stringify(thresholds));
  }, [thresholds]);

  // Update announcement when waterLevel or thresholds change
  useEffect(() => {
    updateAnnouncement();
  }, [waterLevel, thresholds]);

  // MQTT subscription for live real-time updates
  useEffect(() => {
    let mqttClient = null;
    let mounted = true;

    const connectMQTT = () => {
      const client = mqtt.connect(MQTT_BROKER);
      client.on('connect', () => {
        console.log('Announcement: connected to MQTT');
        client.subscribe('sensor/hulo/reading');
        client.subscribe('system/settings');
      });

      client.on('message', (topic, message) => {
        if (!mounted) return;
        try {
          const payload = JSON.parse(message.toString());
          if (topic === 'sensor/hulo/reading') {
            setWaterLevel(payload.distance);
          } else if (topic === 'system/settings') {
            setThresholds({
              normal: payload.threshold_normal,
              attention: payload.threshold_attention,
              critical: payload.threshold_critical
            });
          }
        } catch (e) {
          console.error('Announcement parse error:', e);
        }
      });
      mqttClient = client;
    };

    connectMQTT();
    return () => {
      mounted = false;
      if (mqttClient) mqttClient.end();
    };
  }, []);

  // ---------- Scrolling logic (unchanged) ----------
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

  return (
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
  );
};

export default Announcement;