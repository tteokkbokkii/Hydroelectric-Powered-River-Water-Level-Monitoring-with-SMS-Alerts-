import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Toast } from 'primereact/toast';

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

const SystemTab = () => {
  const [activeTab, setActiveTab] = useState('SETTINGS');
  const [thresholds, setThresholds] = useState({
    normal: 6.5,
    attention: 8.0,
    critical: 9.5
  });
  const [intervals, setIntervals] = useState({
    reading: 5,
    predicting: 60
  });
  const [notifications, setNotifications] = useState({
    normal: true,
    attention: true,
    critical: true,
    powerLoss: true,
    sensorDisconnect: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const toast = useRef(null);

  // Popup state
  const [popup, setPopup] = useState({ visible: false, message: '', severity: '', buttons: [] });

  const showPopup = (message, severity, buttons = [{ label: 'OK', onClick: null }]) => {
    setPopup({ visible: true, message, severity, buttons });
  };

  const closePopup = () => {
    setPopup({ visible: false, message: '', severity: '', buttons: [] });
  };

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedThresholds = localStorage.getItem('sensorThresholds');
    const savedIntervals = localStorage.getItem('readingIntervals');
    const savedNotifications = localStorage.getItem('notificationSettings');
    if (savedThresholds) setThresholds(JSON.parse(savedThresholds));
    if (savedIntervals) setIntervals(JSON.parse(savedIntervals));
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
  }, []);

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
      localStorage.setItem('sensorThresholds', JSON.stringify(thresholds));
      localStorage.setItem('readingIntervals', JSON.stringify(intervals));
      localStorage.setItem('notificationSettings', JSON.stringify(notifications));
      showPopup('Settings saved successfully!', 'success');
    } catch (err) {
      console.error(err);
      showPopup('Could not save settings. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefault = () => {
    const defaultThresholds = { normal: 6.5, attention: 8.0, critical: 9.5 };
    const defaultIntervals = { reading: 5, predicting: 60 };
    const defaultNotifications = {
      normal: true,
      attention: true,
      critical: true,
      powerLoss: true,
      sensorDisconnect: true
    };
    setThresholds(defaultThresholds);
    setIntervals(defaultIntervals);
    setNotifications(defaultNotifications);
    showPopup('Settings have been reset to defaults. Click SAVE CHANGES to apply.', 'info');
  };

  const handleReboot = () => {
    showPopup('Reboot request sent', 'info');
  };

  // Test functions to simulate notifications (for local testing)
  const testNormalNotification = () => {
    if (notifications.normal) {
      showPopup('The water level is currently normal.', 'info');
    } else {
      showPopup('Normal threshold alerts are disabled', 'error');
    }
  };
  const testWarningNotification = () => {
    if (notifications.attention) {
      showPopup('The water level needs Coast Guard judgment.', 'warn');
    } else {
      showPopup('Needs Attention alerts are disabled', 'error');
    }
  };
  const testCriticalNotification = () => {
    if (notifications.critical) {
      showPopup('The water level reached critical levels.', 'error');
    } else {
      showPopup('Highly Critical alerts are disabled', 'error');
    }
  };
  const testPowerLossNotification = () => {
    if (notifications.powerLoss) {
      showPopup('Power loss detected. System restarted.', 'error');
    } else {
      showPopup('Power/Turbine Loss alerts are disabled', 'error');
    }
  };
  const testSensorDisconnectNotification = () => {
    if (notifications.sensorDisconnect) {
      showPopup('One or more sensors are disconnected. Please check connections.', 'warn');
    } else {
      showPopup('Sensor Disconnect alerts are disabled', 'error');
    }
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

        /* Custom number input styles */
        .custom-number-input {
          display: flex;
          align-items: center;
          background: #e9ecef;
          border-radius: 4px;
          padding: 0 8px;
          min-width: 100px;
        }
        .custom-number-input .settings-input {
          width: 60px;
          border: none !important;
          background: transparent !important;
          padding: 8px 4px !important;
          text-align: right;
          outline: none;
        }
        .custom-number-input .unit-label {
          margin-left: 4px;
          font-size: 14px;
          color: #555;
        }
        .custom-number-input .number-buttons {
          display: flex;
          flex-direction: column;
          margin-left: 6px;
        }
        .custom-number-input .number-btn {
          background: none;
          border: none;
          font-size: 10px;
          cursor: pointer;
          padding: 2px 4px;
          line-height: 1;
          color: #666;
        }
        .custom-number-input .number-btn:hover {
          color: #0072CE;
        }
        .custom-number-input .settings-input {
          -moz-appearance: textfield;
        }
        .custom-number-input .settings-input::-webkit-inner-spin-button,
        .custom-number-input .settings-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        /* Popup Styles */
        .notification-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease-in;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .notification-card {
          position: relative;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          width: 90%;
          max-width: 400px;
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .notification-close-x {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          line-height: 1;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background 0.2s;
        }
        .notification-close-x:hover {
          background: #f0f0f0;
          color: #333;
        }
        .notification-header {
          padding: 20px 20px 0 20px;
          border-bottom: 1px solid #eef2f6;
        }
        .notification-header h3 {
          margin: 0;
          font-size: 1.2rem;
          font-weight: bold;
          font-family: InterBlack, sans-serif;
          text-transform: uppercase;
        }
        .notification-card.error .notification-header h3 { color: #dc2626; }
        .notification-card.warn .notification-header h3 { color: #f59e0b; }
        .notification-card.info .notification-header h3 { color: #0072CE; }
        .notification-card.success .notification-header h3 { color: #10b981; }
        .notification-body {
          padding: 20px;
          text-align: center;
          font-size: 1rem;
          line-height: 1.5;
          color: #333;
          font-family: InterMedium, sans-serif;
        }
        .notification-footer {
          padding: 0 20px 20px 20px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .notification-primary-btn, .notification-secondary-btn {
          background-color: #0072CE;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 24px;
          font-weight: bold;
          cursor: pointer;
          font-family: InterMedium, sans-serif;
          transition: background 0.2s;
        }
        .notification-primary-btn:hover {
          background-color: #005bb5;
        }
        .notification-secondary-btn {
          background-color: #e9ecef;
          color: #333;
        }
        .notification-secondary-btn:hover {
          background-color: #d0d5db;
        }

        /* Test buttons */
        .test-buttons {
          margin-top: 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
        }
        .test-btn {
          background: #e9ecef;
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .test-btn:hover {
          background: #d0d5db;
        }
      `}</style>

      <div className="card-wrapper" id="main-profile-card">
        <h1 className="card-heading">SYSTEM</h1>

        <div className="tab-nav">
          <button
            className={`nav-item ${activeTab === 'ABOUT' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('ABOUT')}
          >ABOUT</button>
          <button
            className={`nav-item ${activeTab === 'SETTINGS' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('SETTINGS')}
          >SETTINGS</button>
        </div>

        <div className="tab-panel">
          {activeTab === 'ABOUT' && (
            <div className="system-grid">
              {/* Left Column: Network & System */}
              <div className="system-column border-right">
                <div className="content-group">
                  <h3 className="SysTab-title">NETWORK</h3>
                  <div className="data-row">
                    <span>Server IP :</span>
                    <span className="value-box">[ 192.168.1.15 ]</span>
                  </div>
                  <div className="data-row">
                    <span>MQTT Port :</span>
                    <span className="value-box">[ 1883 ]</span>
                  </div>
                </div>

                <div className="content-group mt-20">
                  <h3 className="SysTab-title">SYSTEM</h3>
                  <div className="data-row">
                    <span>System Up:</span>
                    <span className="status-pill">14d 05h 22m</span>
                  </div>
                  <div className="data-row">
                    <span>Signal:</span>
                    <span className="status-pill">Excellent</span>
                  </div>
                  <div className="data-row">
                    <span>Network:</span>
                    <span className="status-pill">4G / LTE</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Uptime and Connectivity */}
              <div className="system-column">
                <div className="content-group">
                  <h3 className="SysTab-title">UPTIME AND CONNECTIVITY</h3>
                  <div className="data-row">
                    <span>Raspberry Pi 4:</span>
                    <span className="status-pill">ONLINE</span>
                  </div>
                  <div className="data-row">
                    <span>ESP32:</span>
                    <span className="status-pill">LINKED</span>
                  </div>
                  <div className="data-row">
                    <span>Ultrasonic Sensor:</span>
                    <span className="status-pill">ACTIVE</span>
                  </div>
                  <div className="data-row">
                    <span>Float Switch Sensor:</span>
                    <span className="status-pill">READY</span>
                  </div>
                  <div className="data-row">
                    <span>Real-Time Clock:</span>
                    <span className="status-pill">SYNCED</span>
                  </div>
                  <div className="data-row">
                    <span>GSM Module:</span>
                    <span className="status-pill">STABLE</span>
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
                    <NumberInput
                      value={thresholds.normal}
                      onChange={(val) => handleThresholdChange('normal', val)}
                      step={0.01}
                      min={0}
                      max={12}
                      unit="ft."
                      decimalPlaces={2}
                    />
                  </div>

                  <div className="settings-row">
                    <span>Needs Attention :</span>
                    <NumberInput
                      value={thresholds.attention}
                      onChange={(val) => handleThresholdChange('attention', val)}
                      step={0.01}
                      min={0}
                      max={12}
                      unit="ft."
                      decimalPlaces={2}
                    />
                  </div>

                  <div className="settings-row">
                    <span>Highly Critical :</span>
                    <NumberInput
                      value={thresholds.critical}
                      onChange={(val) => handleThresholdChange('critical', val)}
                      step={0.01}
                      min={0}
                      max={12}
                      unit="ft."
                      decimalPlaces={2}
                    />
                  </div>
                </div>

                <div className="content-group mt-20">
                  <h3 className="SysTab-title">INTERVALS</h3>
                  <div className="settings-row">
                    <span>Reading Intervals :</span>
                    <NumberInput
                      value={intervals.reading}
                      onChange={(val) => handleIntervalChange('reading', val)}
                      step={1}
                      min={1}
                      max={10}
                      unit="mins."
                      decimalPlaces={0}
                    />
                  </div>
                  <div className="settings-row">
                    <span>Predicting Intervals :</span>
                    <NumberInput
                      value={intervals.predicting}
                      onChange={(val) => handleIntervalChange('predicting', val)}
                      step={1}
                      min={5}
                      max={60}
                      unit="mins."
                      decimalPlaces={0}
                    />
                  </div>
                </div>
              </div>

              <div className="settings-column">
                <div className="content-group">
                  <h3 className="SysTab-title">PUSH NOTIFICATION</h3>
                  <div className="notification-section">
                    <span className="section-label">Threshold Alerts</span>
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
                      <div className="toggle-row">
                        <span>Highly Critical</span>
                        <label className="switch">
                          <input type="checkbox" checked={notifications.critical} onChange={() => handleNotificationChange('critical')} />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="notification-section mt-20">
                    <span className="section-label">System Alerts</span>
                    <div className="toggle-group">
                      <div className="toggle-row">
                        <span>Power/Turbine Loss</span>
                        <label className="switch">
                          <input type="checkbox" checked={notifications.powerLoss} onChange={() => handleNotificationChange('powerLoss')} />
                          <span className="slider"></span>
                        </label>
                      </div>
                      <div className="toggle-row">
                        <span>Sensor Disconnect</span>
                        <label className="switch">
                          <input type="checkbox" checked={notifications.sensorDisconnect} onChange={() => handleNotificationChange('sensorDisconnect')} />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Test buttons for local simulation */}
                  <div className="test-buttons">
                    <button className="test-btn" onClick={testNormalNotification}>Test Normal</button>
                    <button className="test-btn" onClick={testWarningNotification}>Test Warning</button>
                    <button className="test-btn" onClick={testCriticalNotification}>Test Critical</button>
                    <button className="test-btn" onClick={testPowerLossNotification}>Test Power Loss</button>
                    <button className="test-btn" onClick={testSensorDisconnectNotification}>Test Sensor Disconnect</button>
                  </div>
                </div>

                <div className="settings-actions">
                  <button className="action-button save-btn" onClick={saveChanges} disabled={isLoading}>
                    {isLoading ? 'SAVING...' : 'SAVE CHANGES'}
                  </button>
                  <button className="action-button reset-btn" onClick={resetToDefault} disabled={isLoading}>
                    RESET TO DEFAULT
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Popup */}
      {popup.visible && (
        <Popup
          message={popup.message}
          severity={popup.severity}
          buttons={popup.buttons}
          onClose={closePopup}
        />
      )}
    </div>
  );
};

export default SystemTab;