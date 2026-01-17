import React, { useState } from 'react';

const TabContainer = () => {
  const [activeTab, setActiveTab] = useState('tab1');

  return (
    <div className="card-wrapper" id="main-profile-card">
      <h1 className="card-heading">Card Title</h1>      
        <div className="tab-nav">
          <button 
            className={`nav-item ${activeTab === 'tab1' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('tab1')}
          >
            tab1
          </button>
          <button 
            className={`nav-item ${activeTab === 'tab2' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('tab2')}
          >
            tab2
          </button>
        </div>

        <div className="tab-panel">
          {activeTab === 'tab1' && (
            <div className="panel-content-area" id="tab1-section">
              <h3>PANEL TITLE</h3>
              <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Facilis iusto aperiam cum, nobis perferendis incidunt quae et dicta voluptas commodi repellat quia sed consectetur neque excepturi molestias a, quis saepe.</p>
            </div>
          )}

          {activeTab === 'tab2' && (
            <div className="panel-content-area" id="tab2-section">
              <h3>PANEL TITLE</h3>
              <p>Lorem ipsum dolor sit amet consectetur, adipisicing elit. Expedita odio omnis voluptatem excepturi aspernatur, quasi eum placeat debitis sed velit molestias dolore dicta voluptatibus, inventore itaque sequi suscipit corporis nulla.</p>
            </div>
          )}
        </div>
    </div>
  );
};

export default TabContainer;