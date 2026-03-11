import React, { useState, useEffect } from 'react';

const SystemTab = () => {
  const [activeTab, setActiveTab] = useState('SETTINGS');

  // ---------- State for Settings ----------
  // Load from localStorage if available, otherwise use defaults
  const [thresholds, setThresholds] = useState(() => {
    const saved = localStorage.getItem('sensorThresholds');
    return saved ? JSON.parse(saved) : {
      normal: 6.5,
      attention: 8.0,
      critical: 9.5
    };
  });

  const [intervals, setIntervals] = useState(() => {
    const saved = localStorage.getItem('readingIntervals');
    return saved ? JSON.parse(saved) : {
      reading: 5,
      predicting: 60
    };
  });

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('notificationSettings');
    return saved ? JSON.parse(saved) : {
      normal: true,
      attention: true,
      critical: true,
      powerLoss: true,
      sensorDisconnect: true
    };
  });

  // Handlers for input changes
  const handleThresholdChange = (key, value) => {
    setThresholds(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const handleIntervalChange = (key, value) => {
    setIntervals(prev => ({ ...prev, [key]: parseInt(value, 10) || 0 }));
  };

  const handleNotificationChange = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Save to localStorage and optionally send to ESP32
  const saveChanges = () => {
    // Persist to localStorage
    localStorage.setItem('sensorThresholds', JSON.stringify(thresholds));
    localStorage.setItem('readingIntervals', JSON.stringify(intervals));
    localStorage.setItem('notificationSettings', JSON.stringify(notifications));

    // Send to ESP32 (example using fetch - adjust URL to your ESP32 endpoint)
    const config = {
      thresholds,
      intervals,
      notifications
    };

    // Replace with your ESP32 IP and endpoint
    const ESP32_URL = 'http://192.168.1.100/api/settings';

    fetch(ESP32_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
      .then(response => {
        if (response.ok) {
          alert('Settings saved and sent to ESP32 successfully!');
        } else {
          alert('Saved locally, but failed to send to ESP32.');
        }
      })
      .catch(error => {
        console.error('Error sending to ESP32:', error);
        alert('Saved locally, but ESP32 unreachable.');
      });
  };

  // Reset to default values
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

    // Optionally save defaults to localStorage and send to ESP32
    localStorage.setItem('sensorThresholds', JSON.stringify(defaultThresholds));
    localStorage.setItem('readingIntervals', JSON.stringify(defaultIntervals));
    localStorage.setItem('notificationSettings', JSON.stringify(defaultNotifications));

    // Also send to ESP32 if desired (similar to saveChanges)
    // ... (code same as above)
  };

  // ---------- Render ----------
  return (
    <div className="main-content">
      <style>{`
        /* (keep all your existing styles) */
        .input-with-unit { display: flex; align-items: center; background: #e9ecef; border-radius: 4px; padding: 0 8px; min-width: 100px; }
        .settings-input { border: none !important; background: transparent !important; width: 60px; padding: 8px 4px !important; text-align: right; outline: none; }
        .settings-input::-webkit-inner-spin-button, .settings-input::-webkit-outer-spin-button { opacity: 1 !important; cursor: pointer; }
        .unit-label { font-size: 14px; color: #555; margin-left: 4px; padding-bottom: 2px; }
        .settings-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }

        /* Scroll fix */
        .card-wrapper { display: flex; flex-direction: column; height: 100%; max-height: 100%; }
        .tab-panel { flex: 1; overflow-y: auto; padding-right: 4px; }
        .tab-panel::-webkit-scrollbar { width: 6px; }
        .tab-panel::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.2); border-radius: 3px; }
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
                  <div className="data-row">
                    <span>Battery Health:</span>
                    <span className="status-pill">100%</span>
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
                  <button className="reboot-button">REBOOT</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'SETTINGS' && (
            <div className="settings-grid">
              {/* Left Column: Thresholds (now 3) and Intervals */}
              <div className="settings-column border-right">
                <div className="content-group">
                  <h3 className="SysTab-title">SENSOR THRESHOLDS</h3>

                  <div className="settings-row">
                    <span>Normal Thresholds :</span>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        step="0.1"
                        className="settings-input"
                        value={thresholds.normal}
                        onChange={(e) => handleThresholdChange('normal', e.target.value)}
                      />
                      <span className="unit-label">ft.</span>
                    </div>
                  </div>

                  <div className="settings-row">
                    <span>Needs Attention :</span>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        step="0.1"
                        className="settings-input"
                        value={thresholds.attention}
                        onChange={(e) => handleThresholdChange('attention', e.target.value)}
                      />
                      <span className="unit-label">ft.</span>
                    </div>
                  </div>

                  <div className="settings-row">
                    <span>Highly Critical :</span>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        step="0.1"
                        className="settings-input"
                        value={thresholds.critical}
                        onChange={(e) => handleThresholdChange('critical', e.target.value)}
                      />
                      <span className="unit-label">ft.</span>
                    </div>
                  </div>
                  {/* Removed Extremely Critical row */}
                </div>

                <div className="content-group mt-20">
                  <h3 className="SysTab-title">INTERVALS</h3>
                  <div className="settings-row">
                    <span>Reading Intervals :</span>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        className="settings-input"
                        value={intervals.reading}
                        onChange={(e) => handleIntervalChange('reading', e.target.value)}
                      />
                      <span className="unit-label">mins.</span>
                    </div>
                  </div>
                  <div className="settings-row">
                    <span>Predicting Intervals :</span>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        className="settings-input"
                        value={intervals.predicting}
                        onChange={(e) => handleIntervalChange('predicting', e.target.value)}
                      />
                      <span className="unit-label">mins.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Push Notifications */}
              <div className="settings-column">
                <div className="content-group">
                  <h3 className="SysTab-title">PUSH NOTIFICATION</h3>
                  <div className="notification-section">
                    <span className="section-label">Threshold Alerts</span>
                    <div className="toggle-group">
                      <div className="toggle-row">
                        <span>Normal Thresholds</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={notifications.normal}
                            onChange={() => handleNotificationChange('normal')}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                      <div className="toggle-row">
                        <span>Needs Attention</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={notifications.attention}
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
                            checked={notifications.critical}
                            onChange={() => handleNotificationChange('critical')}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                      {/* Removed Extremely Critical toggle */}
                    </div>
                  </div>

                  <div className="notification-section mt-20">
                    <span className="section-label">System Alerts</span>
                    <div className="toggle-group">
                      <div className="toggle-row">
                        <span>Power/Turbine Loss</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={notifications.powerLoss}
                            onChange={() => handleNotificationChange('powerLoss')}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                      <div className="toggle-row">
                        <span>Sensor Disconnect</span>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={notifications.sensorDisconnect}
                            onChange={() => handleNotificationChange('sensorDisconnect')}
                          />
                          <span className="slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="settings-actions">
                  <button className="action-button save-btn" onClick={saveChanges}>
                    SAVE CHANGES
                  </button>
                  <button className="action-button reset-btn" onClick={resetToDefault}>
                    RESET TO DEFAULT
                  </button>
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