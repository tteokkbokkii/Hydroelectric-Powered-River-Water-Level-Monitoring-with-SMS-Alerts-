import React, { useState, useEffect, useRef, useContext } from 'react';
import { Toast } from 'primereact/toast';
import mqtt from 'mqtt';
import '../../styles/SystemTab.css';
import { GlobalContext } from './GlobalStateProvider'; 

// ---------- Custom Number Input Component ----------
const NumberInput = ({ value, onChange, step = 0.1, min, max, unit, decimalPlaces = 2 }) => {
  // 1. Initialize local state with forced decimal formatting
  const [typingValue, setTypingValue] = useState(
    value !== undefined && value !== null ? Number(value).toFixed(decimalPlaces) : ''
  );

  // Sync internal state if the parent value changes (handles RESET TO DEFAULT)
  useEffect(() => {
    if (value !== undefined && value !== null) {
      setTypingValue(Number(value).toFixed(decimalPlaces));
    }
  }, [value, decimalPlaces]);

  // 2. The Bouncer: Blocks letters instantly while allowing typing decimal points
  const handleInputChange = (e) => {
    const raw = e.target.value;
    // REGEX: Blocks letters. Only allows numbers and one decimal point.
    if (raw === '' || /^-?\d*\.?\d*$/.test(raw)) {
      setTypingValue(raw);
    }
  };

  // 3. The Finalizer: Clamps, rounds, and forces decimal places on Blur or Enter
  const finalizeValue = (rawInput) => {
    let num = parseFloat(rawInput);
    
    if (isNaN(num)) {
      num = min !== undefined ? min : 0;
    }

    let clamped = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, num));
    const formattedStr = clamped.toFixed(decimalPlaces);
    
    setTypingValue(formattedStr); 
    onChange(parseFloat(formattedStr)); 
  };

  return (
    <div className="custom-number-input">
      <input
        type="text"
        className="settings-input"
        value={typingValue}
        onChange={handleInputChange} 
        onBlur={() => finalizeValue(typingValue)}
        onKeyDown={(e) => e.key === 'Enter' && finalizeValue(typingValue)}
      />
      <span className="unit-label">{unit}</span>
      <div className="number-buttons">
        <button 
          type="button" 
          onClick={() => finalizeValue(parseFloat(value || 0) + step)} 
          className="number-btn up"
        >▲</button>
        <button 
          type="button" 
          onClick={() => finalizeValue(parseFloat(value || 0) - step)} 
          className="number-btn down"
        >▼</button>
      </div>
    </div>
  );
};

const currentIP = window.location.hostname || 'rivermonitoring.local';
const API_BASE = `http://${currentIP}:5000/api`;
const MQTT_BROKER = `ws://${currentIP}:9001`;

const SystemTab = () => {
  const [activeTab, setActiveTab] = useState('ABOUT');
  
  // Live status (ABOUT tab)
  const [liveStatus, setLiveStatus] = useState({
    serverIp: currentIP,
    mqttPort: '9001',
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

  // Settings state (To DO: MUST BE MANUALLY CHECKED LATER)
  const [thresholds, setThresholds] = useState({ normal: 9.0, attention: 10.0, critical: 11.0 });
  const [intervals, setIntervals] = useState({ reading: 5, predicting: 60 });
  const { popupSettings, setPopupSettings } = useContext(GlobalContext);
  
  const [isLoading, setIsLoading] = useState(false);
  const mqttClientRef = useRef(null);
  const toast = useRef(null);

  // Fetch initial settings
  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then(res => res.json())
      .then(data => {
        setThresholds({
          normal: parseFloat(data.threshold_normal) || 9.0,
          attention: parseFloat(data.threshold_attention) || 10.0,
          critical: parseFloat(data.threshold_critical) || 11.0
        });
        setIntervals({
          reading: data.reading_interval,
          predicting: data.predicting_interval || 60
        });
      })
      .catch(err => console.error('Error fetching settings:', err));
  }, []); 

  // MQTT Connection for Live Hardware Status
  useEffect(() => {
    const client = mqtt.connect(MQTT_BROKER);
    mqttClientRef.current = client;
    
    client.on('connect', () => {
      client.subscribe('system/status');
    });

    client.on('message', (topic, message) => {
      if (topic === 'system/status') {
        try {
          const status = JSON.parse(message.toString());
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
        } catch (e) { console.error("Error parsing system status", e); }
      }
    });

    return () => { if (client) client.end(); };
  }, []);
  
  // ---------- Handlers ----------
  const handleThresholdChange = (key, value) => {
    setThresholds(prev => {
      let num = parseFloat(value) || 0;
      let newValues = { ...prev };

      const safeNormal = parseFloat(prev.normal);
      const safeAttention = parseFloat(prev.attention);
      const safeCritical = parseFloat(prev.critical);

      if (key === 'normal' && num >= safeAttention) {
        num = safeAttention - 0.01;
      } else if (key === 'attention') {
        if (num <= safeNormal) num = safeNormal + 0.01;
        if (num >= safeCritical) num = safeCritical - 0.01;
      } else if (key === 'critical' && num <= safeAttention) {
        num = safeAttention + 0.01;
      }

      newValues[key] = parseFloat(num.toFixed(2));
      return newValues;
    });
  };

  const handleIntervalChange = (key, value) => {
    setIntervals(prev => ({ ...prev, [key]: parseInt(value, 10) || 0 }));
  };

  const handleNotificationChange = (key) => {
    setPopupSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const saveChanges = async () => {
    setIsLoading(true);
    try {
      const payload = {
        threshold_normal: thresholds.normal,
        threshold_attention: thresholds.attention,
        threshold_critical: thresholds.critical,
        reading_interval: intervals.reading
      };
      
      const response = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Failed to save settings');
      
      if (mqttClientRef.current && mqttClientRef.current.connected) {
        mqttClientRef.current.publish('system/settings/update', JSON.stringify(payload));
      }
      
      toast.current.show({ severity: 'success', summary: 'Success', detail: 'Settings saved successfully!', life: 3000 });
    } catch (err) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Could not save settings. Please try again.', life: 3000 });
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefault = () => {
    setThresholds({ normal: 21.0, attention: 25.0, critical: 26.0 });
    setIntervals({ reading: 5, predicting: 60 });
    setPopupSettings({ attention: true, critical: true });
    toast.current.show({ severity: 'info', summary: 'Reset', detail: 'Settings reset to defaults. Click SAVE CHANGES to apply.', life: 4000 });
  };

  return (
    <div className="main-content">
      <Toast ref={toast} />

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
                    <span>Pi Uptime:</span>
                    <span className="status-pill">{liveStatus.systemUp}</span>
                  </div>
                  <div className="data-row">
                    <span>Wi-Fi Signal:</span>
                    <span className="status-pill">
                      {liveStatus.signal === 'N/A' ? 'HOTSPOT' : liveStatus.signal}
                    </span>
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
                    <NumberInput 
                      value={thresholds.normal} 
                      onChange={(val) => handleThresholdChange('normal', val)} 
                      step={0.01} 
                      min={0} 
                      max={thresholds.attention - 0.01} 
                      unit="ft." 
                    />
                  </div>
                  <div className="settings-row">
                    <span>Needs Attention :</span>
                    <NumberInput 
                      value={thresholds.attention} 
                      onChange={(val) => handleThresholdChange('attention', val)} 
                      step={0.01} 
                      min={thresholds.normal + 0.01} 
                      max={thresholds.critical - 0.01} 
                      unit="ft." 
                    />
                  </div>
                  <div className="settings-row">
                    <span>Highly Critical :</span>
                    <NumberInput 
                      value={thresholds.critical} 
                      onChange={(val) => handleThresholdChange('critical', val)} 
                      step={0.01} 
                      min={thresholds.attention + 0.01} 
                      max={26} 
                      unit="ft." 
                    />
                  </div>
                </div>
                <div className="content-group mt-20">
                  <h3 className="SysTab-title">INTERVALS</h3>
                  <div className="settings-row">
                    <span>Reading Intervals :</span>
                    <NumberInput value={intervals.reading} onChange={(val) => handleIntervalChange('reading', val)} step={1} min={1} max={5} unit="mins." decimalPlaces={0} />
                  </div>
                </div>
              </div>
              <div className="settings-column">
                <div className="content-group">
                  <h3 className="SysTab-title">POP UP NOTIFICATIONS</h3>
                  <div className="toggle-group">
                    <div className="toggle-row">
                      <span>Needs Attention</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={popupSettings.attention} 
                          onChange={() => handleNotificationChange('attention')} 
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                    <div className="toggle-row">
                      <span>Highly Critical</span>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={popupSettings.critical} 
                          onChange={() => handleNotificationChange('critical')} 
                        />
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
    </div>
  );
};

export default SystemTab;