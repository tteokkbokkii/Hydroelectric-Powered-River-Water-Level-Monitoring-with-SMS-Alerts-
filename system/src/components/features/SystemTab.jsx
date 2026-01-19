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

        <div className="tab-panel content-padding">
          {/* Conditional rendering directly inside the return */}
          {activeTab === 'ABOUT' && (
            <div className="single-content-area">
              <p>
                <strong>ABOUT SECTION:</strong> Lorem ipsum dolor sit amet, consectetur 
                adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore 
                magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation 
                ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
            </div>
          )}

          {activeTab === 'SETTINGS' && (
            <div className="single-content-area">
              <p>
                <strong>SETTINGS SECTION:</strong> Duis aute irure dolor in reprehenderit 
                in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
                Excepteur sint occaecat cupidatat non proident, sunt in culpa qui 
                officia deserunt mollit anim id est laborum.
              </p>
            </div>
          )}
        </div>

        <div className="bottom-spacer"></div> 
      </div>
    </div>
  );
};

export default TabContainer;