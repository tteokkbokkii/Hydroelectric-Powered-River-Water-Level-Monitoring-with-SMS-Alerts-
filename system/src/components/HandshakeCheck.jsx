import React, { useEffect, useState } from 'react';
import mqtt from 'mqtt';

const MQTT_BROKER = "ws://192.168.43.154:9001";
const TOPIC = "river/monitor/json";

const HandshakeCheck = () => {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("Connecting...");
  const [systemTime, setSystemTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setSystemTime(new Date()), 1000);
    const client = mqtt.connect(MQTT_BROKER);

    client.on('connect', () => {
      setStatus("Connected");
      client.subscribe(TOPIC);
    });

    client.on('message', (topic, message) => {
      try {
        const rawMessage = message.toString().trim(); // Trim extra spaces
        const parsed = JSON.parse(rawMessage);
        setData(parsed);
        setStatus("Connected"); // Keep status green when data arrives
      } catch (e) {
        console.error("Payload error:", message.toString());
        // If it fails, try to see if it's just a simple string issue
      }
    });

    return () => {
      client.end();
      clearInterval(timer);
    };
  }, []);

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        
        {/* Header Section */}
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>River System Verification</h1>
            <p style={subtitleStyle}>Handshake & Time Synchronization Check</p>
          </div>
          <div style={badgeStyle(status)}>{status}</div>
        </div>

        {/* Time Comparison Section */}
        <div style={timeComparisonGrid}>
          <div style={timeBox}>
            <span style={labelStyle}>LOCAL SYSTEM TIME</span>
            <div style={timeValue}>{systemTime.toLocaleTimeString()}</div>
            <div style={dateValue}>{systemTime.toLocaleDateString()}</div>
          </div>
          <div style={{...timeBox, backgroundColor: '#ebf5ff', borderColor: '#2563eb'}}>
            <span style={{...labelStyle, color: '#1e40af'}}>ESP32 RTC TIME</span>
            <div style={{...timeValue, color: '#1e3a8a'}}>{data?.time || "00:00:00"}</div>
            <div style={{...dateValue, color: '#1e40af'}}>{new Date().toLocaleDateString()}</div>
          </div>
        </div>

        {/* Primary Metrics */}
        <div style={metricsGrid}>
          <div style={metricCard}>
            <span style={labelStyle}>WATER LEVEL</span>
            <div style={largeVal}>{data ? data.cm : "--"} <span style={unitStyle}>cm</span></div>
          </div>
          <div style={metricCard}>
            <span style={labelStyle}>WIFI SIGNAL</span>
            <div style={largeVal}>{data ? data.rssi : "--"} <span style={unitStyle}>dBm</span></div>
          </div>
          <div style={metricCard}>
            <span style={labelStyle}>HEARTBEAT</span>
            <div style={largeVal}>{data ? data.debug : "--"} <span style={unitStyle}>ID</span></div>
          </div>
        </div>

        {/* Floats Section */}
        <div style={sectionLabel}>PHYSICAL FLOAT SENSORS</div>
        <div style={floatGrid}>
          <FloatStatus id="1" active={data?.f1} />
          <FloatStatus id="2" active={data?.f2} />
          <FloatStatus id="3" active={data?.f3} />
        </div>

        <div style={footer}>
          <span><b>Broker:</b> {MQTT_BROKER}</span>
          <span><b>Topic:</b> {TOPIC}</span>
        </div>
      </div>
    </div>
  );
};

const FloatStatus = ({ id, active }) => (
  <div style={floatCard(active)}>
    <div
      style={{
        fontSize: '0.85rem',
        fontWeight: '900',
        letterSpacing: '0.05em',
      }}
    >
      FLOAT {id}
    </div>
    <div
      style={{
        fontSize: '1.4rem',
        fontWeight: '800',
      }}
    >
      {active ? 'SUBMERGED' : 'DRY'}
    </div>
  </div>
);

const containerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '100vh',
  backgroundColor: '#e2e8f0',
  padding: '20px',
};

const cardStyle = {
  width: '100%',
  maxWidth: '650px',
  maxHeight: '700px',
  backgroundColor: '#fff',
  borderRadius: '24px',
  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
  padding: '40px',
  border: '2px solid #cbd5e1',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '30px',
};
const titleStyle = {
  margin: 0,
  fontSize: '2rem',
  color: '#0f172a',
  fontWeight: '900',
};
const subtitleStyle = {
  margin: '4px 0 0 0',
  color: '#334155',
  fontSize: '1.1rem',
  fontWeight: '500',
};
const badgeStyle = (s) => ({
  padding: '10px 20px',
  borderRadius: '12px',
  fontWeight: '900',
  fontSize: '0.9rem',
  backgroundColor: s === "Connected" ? "#dcfce7" : "#fee2e2",
  color: s === "Connected" ? "#166534" : "#991b1b",
  border: `2px solid ${s === "Connected" ? "#22c55e" : "#ef4444"}`,
});

const timeComparisonGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '20px',
  marginBottom: '30px',
};
const timeBox = {
  padding: '24px',
  borderRadius: '16px',
  border: '2px solid #e2e8f0',
  textAlign: 'center',
};
const timeValue = {
  fontSize: '2.4rem',
  fontWeight: '800',
  color: '#0f172a',
  fontFamily: 'monospace',
};
const dateValue = {
  fontSize: '1rem',
  color: '#475569',
  fontWeight: '600',
  marginTop: '5px',
};

const metricsGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: '20px',
};
const metricCard = {
  padding: '24px',
  backgroundColor: '#f1f5f9',
  borderRadius: '16px',
  textAlign: 'center',
  border: '1px solid #e2e8f0',
};
const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: '900',
  color: '#334155',
  letterSpacing: '0.1em',
  marginBottom: '8px',
};
const largeVal = {
  fontSize: '2.5rem',
  fontWeight: '900',
  color: '#0f172a',
};
const unitStyle = {
  fontSize: '1.1rem',
  color: '#475569',
  fontWeight: '600',
};

const sectionLabel = {
  fontSize: '0.9rem',
  fontWeight: '900',
  color: '#0f172a',
  margin: '40px 0 16px 0',
  textAlign: 'center',
  letterSpacing: '0.1em',
};
const floatGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: '15px',
};
const floatCard = (active) => ({
  padding: '20px',
  borderRadius: '16px',
  textAlign: 'center',
  backgroundColor: active ? '#1d4ed8' : '#f8fafc',
  color: active ? '#fff' : '#1e293b',
  border: active ? '2px solid #1e40af' : '2px solid #e2e8f0',
  boxShadow: active ? '0 10px 15px -3px rgba(37,99,235,0.4)' : 'none',
});

const footer = {
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: '40px',
  fontSize: '0.85rem',
  color: '#475569',
  borderTop: '2px solid #f1f5f9',
  paddingTop: '20px',
};

export default HandshakeCheck;