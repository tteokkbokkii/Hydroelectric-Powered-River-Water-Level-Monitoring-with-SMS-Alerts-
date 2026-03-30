import React, { useState, useEffect, useRef } from 'react';
import mqtt from 'mqtt';

const MQTT_BROKER = 'ws://192.168.100.97:9001';   // adjust to your Pi's IP
const SIMULATION = false;   // set true for local testing

const Announcement = () => {
  const [message, setMessage] = useState('RIVER ELEVATION AT -- FT. | NORMAL');
  const [color, setColor] = useState('#ABD9FF');
  const [isScrolling, setIsScrolling] = useState(false);
  const textRef = useRef(null);
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const scrollPosRef = useRef(0);
  const directionRef = useRef(1); // 1 = right, -1 = left
  const maxOffsetRef = useRef(0);

  // Helper to build the announcement text and color
  const updateAnnouncement = (waterLevel, range, extraMessages = []) => {
    const mainText = `RIVER ELEVATION AT ${waterLevel.toFixed(2)} FT. | ${range}`;
    const fullText = extraMessages.length ? `${mainText} | ${extraMessages.join(' | ')}` : mainText;
    // Convert to uppercase
    setMessage(fullText.toUpperCase());

    let newColor = '#ABD9FF';
    if (extraMessages.includes('Power Loss') ||
        extraMessages.includes('Sensor Disconnect') ||
        extraMessages.includes('Server Disconnect')) {
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

  // Start/stop back‑and‑forth scrolling based on overflow
  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    const checkOverflow = () => {
      const containerWidth = container.clientWidth;
      const textWidth = textEl.scrollWidth;

      if (textWidth > containerWidth && !isScrolling) {
        // Start scrolling
        setIsScrolling(true);
        const maxOffset = textWidth - containerWidth;
        maxOffsetRef.current = maxOffset;
        scrollPosRef.current = 0;
        directionRef.current = 1;
        startAnimation();
      } else if (textWidth <= containerWidth && isScrolling) {
        // Stop scrolling
        setIsScrolling(false);
        cancelAnimationFrame(animationRef.current);
        textEl.style.transform = 'translateX(0)';
      }
    };

    const startAnimation = () => {
      const step = () => {
        if (!isScrolling) return;
        let newPos = scrollPosRef.current + directionRef.current * 1; // speed factor (pixels per frame)
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

  // ---------- Real MQTT version ----------
  useEffect(() => {
    if (SIMULATION) return;
    let mqttClient = null;
    let mounted = true;

    const connectMQTT = () => {
      const client = mqtt.connect(MQTT_BROKER);
      client.on('connect', () => {
        console.log('Announcement: connected to MQTT');
        client.subscribe('sensor/hulo/reading');
        client.subscribe('system/status');
      });

      client.on('message', (topic, message) => {
        if (!mounted) return;
        const payload = JSON.parse(message.toString());
        if (topic === 'sensor/hulo/reading') {
          const level = payload.distance;
          const rawRange = payload.range;
          let rangeText = '';
          if (rawRange === 'SAFE') rangeText = 'NORMAL';
          else if (rawRange === 'WARNING') rangeText = 'NEEDS ATTENTION';
          else if (rawRange === 'CRITICAL') rangeText = 'HIGHLY CRITICAL';
          window._announcementData = { level, rangeText };
        } else if (topic === 'system/status') {
          const status = payload;
          const extras = [];
          if (status.reset_reason === 'POWER_ON') extras.push('Power Loss');
          if (!status.ultrasonic_connected || !status.float_connected) extras.push('Sensor Disconnect');
          if (window._announcementData) {
            updateAnnouncement(window._announcementData.level, window._announcementData.rangeText, extras);
          } else {
            updateAnnouncement(0, 'NORMAL', extras);
          }
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

  // ---------- Simulation version (for local testing) ----------
  useEffect(() => {
    if (!SIMULATION) return;
    const states = [
      { level: 5.2, range: 'NORMAL', extras: [] },
      { level: 8.7, range: 'NEEDS ATTENTION', extras: [] },
      { level: 10.8, range: 'HIGHLY CRITICAL', extras: [] },
      { level: 6.3, range: 'NORMAL', extras: ['Power Loss'] },
      { level: 9.2, range: 'NEEDS ATTENTION', extras: ['Sensor Disconnect'] },
      { level: 11.2, range: 'HIGHLY CRITICAL', extras: ['Power Loss', 'Sensor Disconnect'] },
    ];
    let idx = 0;
    const interval = setInterval(() => {
      const state = states[idx % states.length];
      updateAnnouncement(state.level, state.range, state.extras);
      idx++;
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Fallback initial message
  useEffect(() => {
    if (!SIMULATION && !window._announcementData) {
      updateAnnouncement(0, 'NORMAL', []);
    }
  }, []);

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