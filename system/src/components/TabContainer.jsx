import React, { useState } from 'react';

const TabContainer = () => {
  const [activeTab, setActiveTab] = useState(0); 

  const tabs = [{ id: 0, title: 'ACTUAL READING' }, { id: 1, title: 'PREDICTION' }];

  return (
    <div className="card-wrapper">
      <h1 className="card-heading">HISTORICAL WATER LEVEL DATA OF HULO FERRY STATION</h1>
      
      <div className="tab-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-item ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.title}
          </button>
        ))}
      </div>

      <div className="tab-panel">
        <div className="panel-content-area">
          <h2 className="panel-title">{tabs[activeTab].title} VIEW</h2>
          <div className="divider"></div>
          <p className="panel-text">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit... 
            (This area will now stretch to fill the bottom of your screen).
          </p>
        </div>
      </div>
    </div>
  );
};

export default TabContainer;