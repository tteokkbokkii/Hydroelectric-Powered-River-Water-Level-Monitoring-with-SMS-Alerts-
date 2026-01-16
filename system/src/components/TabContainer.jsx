import React, { useState } from 'react';

// Pass 'title' and 'tabs' as props
const TabContainer = ({ cardTitle, tabs }) => {
  const [activeTab, setActiveTab] = useState(0); 

  // Fallback if tabs aren't provided
  if (!tabs || tabs.length === 0) return null;

  return (
    <div className="card-wrapper">
      <h1 className="card-heading">{cardTitle}</h1>
      
      <div className="tab-nav">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`nav-item ${activeTab === index ? 'is-active' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-panel">
        <div className="panel-content-area">
          {/* Render the component associated with the active tab */}
          {tabs[activeTab].content}
        </div>
      </div>
    </div>
  );
};

export default TabContainer;