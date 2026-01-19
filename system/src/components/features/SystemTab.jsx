import React, { useState } from 'react';

const TabContainer = () => {
  const [activeTab, setActiveTab] = useState('ABOUT');

  return (
    <div className="main-content">
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
              {/* Column 1: Network & Power */}
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
                  <h3 className="SysTab-title">POWER AND TURBINE</h3>
                  <div className="data-row">
                    <span>Turbine Speed :</span>
                    <span className="value-box">[ 450 ] RPM</span>
                  </div>
                  <div className="data-row">
                    <span>Current Load :</span>
                    <span className="value-box">[ 12.23 ] W</span>
                  </div>
                  <div className="data-row">
                    <span>Turbine Load :</span>
                    <span className="value-box">[ 15.44 ] W</span>
                  </div>
                  <div className="data-row">
                    <span>In Use:</span>
                    <span className="status-pill">Turbine</span>
                  </div>
                </div>
              </div>

              {/* Column 2: Connectivity Status */}
              <div className="system-column border-right">
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
              </div>

              {/* Column 3: System Health */}
              <div className="system-column">
                <div className="content-group">
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

                <div className="reboot-container">
                  <button className="reboot-button">REBOOT</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'SETTINGS' && (
            <div className="single-content-area">
              <p>Settings configuration would go here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TabContainer;