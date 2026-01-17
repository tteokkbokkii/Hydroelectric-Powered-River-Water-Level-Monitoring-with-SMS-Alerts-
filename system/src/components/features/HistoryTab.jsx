import React, { useState } from 'react';

const HistoryTab = () => {
  const [activeTab, setActiveTab] = useState('ACTUAL READING');

  return (
    <div className="card-wrapper" id="main-profile-card">
      <h1 className="card-heading">HISTORICAL WATER LEVEL DATA OF HULO FERRY STATION</h1>      
        <div className="tab-nav">
          <button 
            className={`nav-item ${activeTab === 'ACTUAL READING' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('ACTUAL READING')}
          >
            ACTUAL READING
          </button>
          <button 
            className={`nav-item ${activeTab === 'PREDICTION' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('PREDICTION')}
          >
            PREDICTION
          </button>
        </div>

        <div className="tab-panel">
          {activeTab === 'ACTUAL READING' && (
            <div className="panel-content-area" id="ACTUAL READING-section">
              <p className='date'>DATE:</p>
            </div>
          )}

          {activeTab === 'PREDICTION' && (
            <div className="panel-content-area" id="PREDICTION-section">
            </div>
          )}
        </div>
    </div>
  );
};

export default HistoryTab;