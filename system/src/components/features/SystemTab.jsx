import React, { useState } from 'react';

const SystemTab = () => {
  const [activeTab, setActiveTab] = useState('SETTINGS');

  return (
    <div className="main-content">
      {/* Internal CSS – added scroll handling */}
      <style>{`
        .input-with-unit {
          display: flex;
          align-items: center;
          background: #e9ecef;
          border-radius: 4px;
          padding: 0 8px;
          min-width: 100px;
        }
        .settings-input {
          border: none !important;
          background: transparent !important;
          width: 60px;
          padding: 8px 4px !important;
          text-align: right;
          outline: none;
        }
        .settings-input::-webkit-inner-spin-button,
        .settings-input::-webkit-outer-spin-button {
          opacity: 1 !important;
          cursor: pointer;
        }
        .unit-label {
          font-size: 14px;
          color: #555;
          margin-left: 4px;
          padding-bottom: 2px;
        }
        .settings-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        /* ---------- SCROLL FIX ---------- */
        /* Ensure the card takes full available height and uses flex column */
        .card-wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;           /* Adjust based on your layout – may need 100vh or calc */
          max-height: 100%;        /* Prevents overflow beyond parent */
        }

        /* Make the tab panel scrollable when content is tall */
        .tab-panel {
          flex: 1;                 /* Takes remaining space */
          overflow-y: auto;        /* Enables vertical scrolling */
          padding-right: 4px;      /* Small padding to avoid scrollbar overlap */
        }

        /* Optional: style scrollbar for better appearance */
        .tab-panel::-webkit-scrollbar {
          width: 6px;
        }
        .tab-panel::-webkit-scrollbar-thumb {
          background-color: rgba(0,0,0,0.2);
          border-radius: 3px;
        }
        /* --------------------------------- */
      `}</style>

      <div className="card-wrapper" id="main-profile-card">
        <h1 className="card-heading">SYSTEM</h1>

        <div className="tab-nav">
          <button
            className={`nav-item ${activeTab === 'ABOUT' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('ABOUT')}
          >
            ABOUT
          </button>
          <button
            className={`nav-item ${activeTab === 'SETTINGS' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('SETTINGS')}
          >
            SETTINGS
          </button>
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
              {/* Left Column: Thresholds and Intervals */}
              <div className="settings-column border-right">
                <div className="content-group">
                  <h3 className="SysTab-title">SENSOR THRESHOLDS</h3>
                  
                  <div className="settings-row">
                    <span>Normal Thresholds :</span>
                    <div className="input-with-unit">
                        <input type="number" step="0.1" className="settings-input" defaultValue="6.5" />
                        <span className="unit-label">ft.</span>
                    </div>
                  </div>

                  <div className="settings-row">
                    <span>Needs Attention :</span>
                    <div className="input-with-unit">
                        <input type="number" step="0.1" className="settings-input" defaultValue="8.0" />
                        <span className="unit-label">ft.</span>
                    </div>
                  </div>

                  <div className="settings-row">
                    <span>Highly Critical :</span>
                    <div className="input-with-unit">
                        <input type="number" step="0.1" className="settings-input" defaultValue="9.5" />
                        <span className="unit-label">ft.</span>
                    </div>
                  </div>

                  <div className="settings-row">
                    <span>Extremely Critical :</span>
                    <div className="input-with-unit">
                        <input type="number" step="0.1" className="settings-input" defaultValue="11.5" />
                        <span className="unit-label">ft.</span>
                    </div>
                  </div>
                </div>

                <div className="content-group mt-20">
                  <h3 className="SysTab-title">INTERVALS</h3>
                  <div className="settings-row">
                    <span>Reading Intervals :</span>
                    <div className="input-with-unit">
                        <input type="number" className="settings-input" defaultValue="5" />
                        <span className="unit-label">mins.</span>
                    </div>
                  </div>
                  <div className="settings-row">
                    <span>Predicting Intervals :</span>
                    <div className="input-with-unit">
                        <input type="number" className="settings-input" defaultValue="60" />
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
                        <label className="switch"><input type="checkbox" defaultChecked /><span className="slider"></span></label>
                      </div>
                      <div className="toggle-row">
                        <span>Needs Attention</span>
                        <label className="switch"><input type="checkbox" defaultChecked /><span className="slider"></span></label>
                      </div>
                      <div className="toggle-row">
                        <span>Highly Critical</span>
                        <label className="switch"><input type="checkbox" defaultChecked /><span className="slider"></span></label>
                      </div>
                      <div className="toggle-row">
                        <span>Extremely Critical</span>
                        <label className="switch"><input type="checkbox" defaultChecked /><span className="slider"></span></label>
                      </div>
                    </div>
                  </div>

                  <div className="notification-section mt-20">
                    <span className="section-label">System Alerts</span>
                    <div className="toggle-group">
                      <div className="toggle-row">
                        <span>Power/Turbine Loss</span>
                        <label className="switch"><input type="checkbox" defaultChecked /><span className="slider"></span></label>
                      </div>
                      <div className="toggle-row">
                        <span>Sensor Disconnect</span>
                        <label className="switch"><input type="checkbox" defaultChecked /><span className="slider"></span></label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="settings-actions">
                  <button className="action-button save-btn">SAVE CHANGES</button>
                  <button className="action-button reset-btn">RESET TO DEFAULT</button>
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