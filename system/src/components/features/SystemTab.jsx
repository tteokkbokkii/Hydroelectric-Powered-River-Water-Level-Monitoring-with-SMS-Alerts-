import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Toast } from 'primereact/toast';
import mqtt from 'mqtt';

// ---------- Custom Number Input Component ----------
const NumberInput = ({ value, onChange, step = 0.1, min, max, unit, decimalPlaces = 2 }) => {
  const formatValue = (val) => {
    if (val === undefined || val === null || val === '') return '';
    const num = parseFloat(val);
    if (isNaN(num)) return '';
    return num.toFixed(decimalPlaces);
  };

  const roundToDecimals = (num) => {
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(num * factor) / factor;
  };

  const handleIncrement = () => {
    let newVal = parseFloat(value) + step;
    if (max !== undefined && newVal > max) newVal = max;
    newVal = roundToDecimals(newVal);
    onChange(newVal);
  };

  const handleDecrement = () => {
    let newVal = parseFloat(value) - step;
    if (min !== undefined && newVal < min) newVal = min;
    newVal = roundToDecimals(newVal);
    onChange(newVal);
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange('');
      return;
    }
    let newVal = parseFloat(raw);
    if (isNaN(newVal)) {
      onChange('');
      return;
    }
    if (min !== undefined && newVal < min) newVal = min;
    if (max !== undefined && newVal > max) newVal = max;
    newVal = roundToDecimals(newVal);
    onChange(newVal);
  };

  const handleBlur = () => {
    let currentVal = value;
    if (currentVal === '' || currentVal === undefined || currentVal === null || isNaN(currentVal)) {
      const defaultVal = min !== undefined ? min : 0;
      onChange(defaultVal);
      return;
    }
    const num = parseFloat(currentVal);
    if (isNaN(num)) {
      onChange(min !== undefined ? min : 0);
      return;
    }
    let clamped = num;
    if (min !== undefined && clamped < min) clamped = min;
    if (max !== undefined && clamped > max) clamped = max;
    clamped = roundToDecimals(clamped);
    if (clamped !== num) {
      onChange(clamped);
    } else {
      onChange(roundToDecimals(num));
    }
  };

  return (
    <div className="custom-number-input">
      <input
        type="text"
        className="settings-input"
        value={formatValue(value)}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      <span className="unit-label">{unit}</span>
      <div className="number-buttons">
        <button type="button" onClick={handleIncrement} className="number-btn up">▲</button>
        <button type="button" onClick={handleDecrement} className="number-btn down">▼</button>
      </div>
    </div>
  );
};

// ---------- Generic Popup Component (using Portal) ----------
const Popup = ({ message, severity, onClose, buttons = [{ label: 'OK', onClick: null }] }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleButtonClick = (btn) => {
    if (btn.onClick) btn.onClick();
    onClose();
  };

  return ReactDOM.createPortal(
    <div className="notification-overlay" onClick={onClose}>
      <div className={`notification-card ${severity}`} onClick={(e) => e.stopPropagation()}>
        <button className="notification-close-x" onClick={onClose}>×</button>
        <div className="notification-header">
          <h3>{severity === 'error' ? '⚠️ ERROR' : severity === 'success' ? '✓ SUCCESS' : 'ℹ️ INFORMATION'}</h3>
        </div>
        <div className="notification-body">
          <p>{message}</p>
        </div>
        <div className="notification-footer">
          {buttons.map((btn, idx) => (
            <button
              key={idx}
              className={idx === 0 ? "notification-primary-btn" : "notification-secondary-btn"}
              onClick={() => handleButtonClick(btn)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

const API_BASE = 'http://192.168.43.154:5000/api';
const MQTT_BROKER = 'ws://192.168.43.154:9001';

const SystemTab = () => {
  const [activeTab, setActiveTab] = useState('ABOUT');
  
  const [liveStatus, setLiveStatus] = useState({
    serverIp: '192.168.1.15',
    mqttPort: '1883',
    systemUp: '00d 00h 00m',
    signal: '--',
    network: '--',
    rpi: '--',
    esp: '--',
    ultrasonic: '--',
    float: '--',
    rtc: '--',
    gsm: '--'
  });

  const [thresholds, setThresholds] = useState({ normal: 6.5, attention: 8.0, critical: 9.5 });
  const [intervals, setIntervals] = useState({ reading: 5, predicting: 60 });
  const [notifications, setNotifications] = useState({
    normal: true, attention: true, critical: true, powerLoss: true, sensorDisconnect: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [mqttClient, setMqttClient] = useState(null);
  const toast = useRef(null);
  const lastRange = useRef(null);
  const [popup, setPopup] = useState({ visible: false, message: '', severity: '', buttons: [] });

  const showPopup = (message, severity, buttons = [{ label: 'OK', onClick: null }]) => {
    setPopup({ visible: true, message, severity, buttons });
  };
  const closePopup = () => {
    setPopup({ visible: false, message: '', severity: '', buttons: [] });
  };

useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then(res => res.json())
      .then(data => {
        console.log("Data received from Pi:", data);
        setThresholds({
          normal: data.threshold_normal,
          attention: data.threshold_attention,
          critical: data.threshold_critical
        });
        setIntervals({
          reading: data.reading_interval,
          predicting: data.predicting_interval
        });
      })
      .catch(err => console.error('Error fetching settings:', err));
  }, []);

useEffect(() => {
    const client = mqtt.connect(MQTT_BROKER);
    
    client.on('connect', () => {
      console.log("Connected to MQTT Broker");
      client.subscribe('sensor/hulo/reading');
      client.subscribe('system/status');
      setMqttClient(client);
    });

    client.on('message', (topic, message) => {
      const payloadString = message.toString();
      console.log(`📩 Received on ${topic}:`, payloadString);

      // --- Handle Sensor Readings ---
      if (topic === 'sensor/hulo/reading') {
        try {
          const data = JSON.parse(payloadString);
          const level = data.distance;
          let currentRange = '';
          
          if (level >= thresholds.critical) currentRange = 'CRITICAL';
          else if (level >= thresholds.attention) currentRange = 'WARNING';
          else currentRange = 'SAFE';

          if (lastRange.current !== currentRange) {
            let msg = '';
            let severity = '';
            if (currentRange === 'CRITICAL' && notifications.critical) { msg = 'The water level reached critical levels.'; severity = 'error'; }
            else if (currentRange === 'WARNING' && notifications.attention) { msg = 'The water level needs Coast Guard judgment.'; severity = 'warn'; }
            else if (currentRange === 'SAFE' && notifications.normal) { msg = 'The water level is currently normal.'; severity = 'info'; }
            if (msg) showPopup(msg, severity);
            lastRange.current = currentRange;
          }
        } catch (e) { 
          console.error('Error parsing sensor reading:', e); 
        }
      } 

      // --- Handle System Status ---
      if (topic === 'system/status') {
        try {
          const status = JSON.parse(payloadString);
          setLiveStatus(prev => ({
            ...prev,
            systemUp: status.uptime || prev.systemUp,
            signal: status.signal_quality || prev.signal,
            network: status.network_type || prev.network,
            rpi: status.rpi_online ? 'ONLINE' : 'OFFLINE',
            esp: status.esp_connected ? 'LINKED' : 'DISCONNECTED',
            ultrasonic: status.ultrasonic_active ? 'ACTIVE' : 'INACTIVE',
            float: status.float_ready ? 'READY' : 'NOT READY',
            rtc: status.rtc_synced ? 'SYNCED' : 'UNSYNCED',
            gsm: status.gsm_status || prev.gsm
          }));
        } catch (e) {
          console.error('Error parsing status JSON:', e);
        }
      }
    });

    return () => { if (client) client.end(); };
}, [thresholds, notifications]);

  const handleThresholdChange = (key, value) => {
    setThresholds(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const handleIntervalChange = (key, value) => {
    setIntervals(prev => ({ ...prev, [key]: parseInt(value, 10) || 0 }));
  };

  const handleNotificationChange = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveChanges = async () => {
    setIsLoading(true);
    try {
      const payload = {
        threshold_normal: thresholds.normal,
        threshold_attention: thresholds.attention,
        threshold_critical: thresholds.critical,
        reading_interval: intervals.reading,
        predicting_interval: intervals.predicting
      };
      const response = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to save settings');
      showPopup('Settings saved successfully!', 'success');
    } catch (err) {
      console.error(err);
      showPopup('Could not save settings. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefault = () => {
    setThresholds({ normal: 6.5, attention: 8.0, critical: 9.5 });
    setIntervals({ reading: 5, predicting: 60 });
    setNotifications({
      normal: true, attention: true, critical: true, powerLoss: true, sensorDisconnect: true
    });
    showPopup('Settings have been reset to defaults. Click SAVE CHANGES to apply.', 'info');
  };

  const handleReboot = () => {
    showPopup('Reboot request sent', 'info');
  };

  return (
    <div className="main-content">
      <Toast ref={toast} />
      <style>{`
        .input-with-unit { display: flex; align-items: center; background: #e9ecef; border-radius: 4px; padding: 0 8px; min-width: 100px; }
        .settings-input { border: none !important; background: transparent !important; width: 60px; padding: 8px 4px !important; text-align: right; outline: none; }
        .unit-label { font-size: 14px; color: #555; margin-left: 4px; padding-bottom: 2px; }
        .settings-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .card-wrapper { display: flex; flex-direction: column; height: 100%; max-height: 100%; }
        .tab-panel { flex: 1; overflow-y: auto; padding-right: 4px; }
        .tab-panel::-webkit-scrollbar { width: 6px; }
        .tab-panel::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.2); border-radius: 3px; }

        .custom-number-input { display: flex; align-items: center; background: #e9ecef; border-radius: 4px; padding: 0 8px; min-width: 100px; }
        .custom-number-input .settings-input { width: 60px; border: none !important; background: transparent !important; padding: 8px 4px !important; text-align: right; outline: none; }
        .custom-number-input .unit-label { margin-left: 4px; font-size: 14px; color: #555; }
        .custom-number-input .number-buttons { display: flex; flex-direction: column; margin-left: 6px; }
        .custom-number-input .number-btn { background: none; border: none; font-size: 10px; cursor: pointer; padding: 2px 4px; line-height: 1; color: #666; }
        .custom-number-input .number-btn:hover { color: #0072CE; }
        .custom-number-input .settings-input { -moz-appearance: textfield; }
        .custom-number-input .settings-input::-webkit-inner-spin-button,
        .custom-number-input .settings-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

        .notification-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 9999; animation: fadeIn 0.2s ease-in; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .notification-card { position: relative; background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); width: 90%; max-width: 400px; animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .notification-close-x { position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 24px; cursor: pointer; color: #666; line-height: 1; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.2s; }
        .notification-close-x:hover { background: #f0f0f0; color: #333; }
        .notification-header { padding: 20px 20px 0 20px; border-bottom: 1px solid #eef2f6; }
        .notification-header h3 { margin: 0; font-size: 1.2rem; font-weight: bold; font-family: InterBlack, sans-serif; text-transform: uppercase; }
        .notification-card.error .notification-header h3 { color: #dc2626; }
        .notification-card.warn .notification-header h3 { color: #f59e0b; }
        .notification-card.info .notification-header h3 { color: #0072CE; }
        .notification-card.success .notification-header h3 { color: #10b981; }
        .notification-body { padding: 20px; text-align: center; font-size: 1rem; line-height: 1.5; color: #333; font-family: InterMedium, sans-serif; }
        .notification-footer { padding: 0 20px 20px 20px; display: flex; justify-content: flex-end; gap: 10px; }
        .notification-primary-btn, .notification-secondary-btn { background-color: #0072CE; color: white; border: none; border-radius: 6px; padding: 8px 24px; font-weight: bold; cursor: pointer; font-family: InterMedium, sans-serif; transition: background 0.2s; }
        .notification-primary-btn:hover { background-color: #005bb5; }
        .notification-secondary-btn { background-color: #e9ecef; color: #333; }
        .notification-secondary-btn:hover { background-color: #d0d5db; }
      `}</style>

      <div className="card-wrapper" id="main-profile-card">
        <h1 className="card-heading">SYSTEM</h1>

        <div className="tab-nav">
          <button className={`nav-item ${activeTab === 'ABOUT' ? 'is-active' : ''}`} onClick={() => setActiveTab('ABOUT')}>ABOUT</button>
          <button className={`nav-item ${activeTab === 'SETTINGS' ? 'is-active' : ''}`} onClick={() => setActiveTab('SETTINGS')}>SETTINGS</button>
        </div>

        <div className="tab-panel">
          {activeTab === 'ABOUT' && (
            <div className="system-grid">
              <div className="system-column border-right">
                <div className="content-group">
                  <h3 className="SysTab-title">NETWORK</h3>
                  <div className="data-row">
                    <span>Server IP :</span>
                    <span className="value-box">[ {liveStatus.serverIp} ]</span>
                  </div>
                  <div className="data-row">
                    <span>MQTT Port :</span>
                    <span className="value-box">[ {liveStatus.mqttPort} ]</span>
                  </div>
                </div>

                <div className="content-group mt-20">
                  <h3 className="SysTab-title">SYSTEM</h3>
                  <div className="data-row">
                    <span>System Up:</span>
                    <span className="status-pill">{liveStatus.systemUp}</span>
                  </div>
                  <div className="data-row">
                    <span>Signal:</span>
                    <span className="status-pill">{liveStatus.signal}</span>
                  </div>
                  <div className="data-row">
                    <span>Network:</span>
                    <span className="status-pill">{liveStatus.network}</span>
                  </div>
                </div>
              </div>

              <div className="system-column">
                <div className="content-group">
                  <h3 className="SysTab-title">UPTIME AND CONNECTIVITY</h3>
                  <div className="data-row">
                    <span>Raspberry Pi 4:</span>
                    <span className="status-pill">{liveStatus.rpi}</span>
                  </div>
                  <div className="data-row">
                    <span>ESP32:</span>
                    <span className="status-pill">{liveStatus.esp}</span>
                  </div>
                  <div className="data-row">
                    <span>Ultrasonic Sensor:</span>
                    <span className="status-pill">{liveStatus.ultrasonic}</span>
                  </div>
                  <div className="data-row">
                    <span>Float Switch Sensor:</span>
                    <span className="status-pill">{liveStatus.float}</span>
                  </div>
                  <div className="data-row">
                    <span>Real-Time Clock:</span>
                    <span className="status-pill">{liveStatus.rtc}</span>
                  </div>
                  <div className="data-row">
                    <span>GSM Module:</span>
                    <span className="status-pill">{liveStatus.gsm}</span>
                  </div>
                </div>
                <div className="reboot-container">
                  <button className="reboot-button" onClick={handleReboot}>REBOOT</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'SETTINGS' && (
            <div className="settings-grid">
              <div className="settings-column border-right">
                <div className="content-group">
                  <h3 className="SysTab-title">SENSOR THRESHOLDS</h3>
                  <div className="settings-row">
                    <span>Normal Thresholds :</span>
                    <NumberInput value={thresholds.normal} onChange={(val) => handleThresholdChange('normal', val)} step={0.01} min={0} max={12} unit="ft." />
                  </div>
                  <div className="settings-row">
                    <span>Needs Attention :</span>
                    <NumberInput value={thresholds.attention} onChange={(val) => handleThresholdChange('attention', val)} step={0.01} min={0} max={12} unit="ft." />
                  </div>
                  <div className="settings-row">
                    <span>Highly Critical :</span>
                    <NumberInput value={thresholds.critical} onChange={(val) => handleThresholdChange('critical', val)} step={0.01} min={0} max={12} unit="ft." />
                  </div>
                </div>
                <div className="content-group mt-20">
                  <h3 className="SysTab-title">INTERVALS</h3>
                  <div className="settings-row">
                    <span>Reading Intervals :</span>
                    <NumberInput value={intervals.reading} onChange={(val) => handleIntervalChange('reading', val)} step={1} min={1} max={10} unit="mins." decimalPlaces={0} />
                  </div>
                  <div className="settings-row">
                    <span>Predicting Intervals :</span>
                    <NumberInput value={intervals.predicting} onChange={(val) => handleIntervalChange('predicting', val)} step={1} min={5} max={60} unit="mins." decimalPlaces={0} />
                  </div>
                </div>
              </div>
              <div className="settings-column">
                <div className="content-group">
                  <h3 className="SysTab-title">PUSH NOTIFICATION</h3>
                  <div className="toggle-group">
                    <div className="toggle-row">
                      <span>Normal Thresholds</span>
                      <label className="switch">
                        <input type="checkbox" checked={notifications.normal} onChange={() => handleNotificationChange('normal')} />
                        <span className="slider"></span>
                      </label>
                    </div>
                    <div className="toggle-row">
                      <span>Needs Attention</span>
                      <label className="switch">
                        <input type="checkbox" checked={notifications.attention} onChange={() => handleNotificationChange('attention')} />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="settings-actions">
                  <button className="action-button save-btn" onClick={saveChanges} disabled={isLoading}>{isLoading ? 'SAVING...' : 'SAVE CHANGES'}</button>
                  <button className="action-button reset-btn" onClick={resetToDefault}>RESET TO DEFAULT</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {popup.visible && (
        <Popup message={popup.message} severity={popup.severity} buttons={popup.buttons} onClose={closePopup} />
      )}
    </div>
  );
};

export default SystemTab;