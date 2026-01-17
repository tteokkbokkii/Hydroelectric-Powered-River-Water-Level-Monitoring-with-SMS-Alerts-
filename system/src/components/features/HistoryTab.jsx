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
            PREDICTED READING
          </button>
        </div>

        <div className="tab-panel">
          {activeTab === 'ACTUAL READING' && (
            <div className="panel-content-area" id="ACTUAL READING-section">
              
              <div className="columns-container">
                
                {/* PANEL 1 */}
                <div className="content-column column-1">
                  <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Expedita, laboriosam soluta! Voluptatibus dicta est accusamus fugit architecto qui aliquam cum. Voluptate possimus aut vel pariatur optio minus soluta velit ex.</p>
                </div>

                {/* PANEL 2 */}
                <div className="content-column column-2">
                  <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Sapiente harum, maxime aliquid provident amet dicta consectetur ex incidunt nobis cupiditate quis at fugiat. Perspiciatis id sint eius dignissimos impedit eveniet.</p>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'PREDICTION' && (
            <div className="panel-content-area" id="PREDICTION-section">
              <p className='date'>PREDICTION VIEW</p>
            </div>
          )}
        </div>
    </div>
  );
};

export default HistoryTab;