import React, { useState, useEffect, useRef } from 'react';
import mqtt from 'mqtt';

const currentIP = window.location.hostname || 'rivermonitoring.local';
const MQTT_BROKER = `ws://${currentIP}:9001`;

const Announcement = () => {
  // Load saved water level and thresholds from localStorage
  const [waterLevel, setWaterLevel] = useState(() => {
    const saved = localStorage.getItem('announcement_waterLevel');
    return saved ? parseFloat(saved) : 0;
  });
  const [thresholds, setThresholds] = useState(() => {
    const saved = localStorage.getItem('announcement_thresholds');
    return saved ? JSON.parse(saved) : { normal: 6.5, attention: 8.0, critical: 9.5 };
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
    } else {
      newColor = '#ABD9FF';
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

  // MQTT subscription
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