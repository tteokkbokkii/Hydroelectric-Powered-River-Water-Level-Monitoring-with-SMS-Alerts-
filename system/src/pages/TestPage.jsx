import React from "react";
// Both files are inside components/features/
import RiverLevel from "../components/features/RiverLevel.jsx";
import HistoryTab from "../components/features/HistoryTab.jsx";

const TestPage = () => {
  return (
    <div style={{ padding: '40px' }}>
      <h1 style={{ color: '#002d5a', marginBottom: '10px' }}>UI Reusability Test Page</h1>
      <p style={{ color: '#666' }}>Confirming components render correctly in a new section with zero logic changes.</p>
      <hr style={{ border: '0.5px solid #ccc', margin: '20px 0' }} />
      
      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        {/* Component Instance 1: Gauge */}
        <div style={{ 
          width: '400px', 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
        }}>
          <h3 style={{ marginTop: 0 }}>Instance 1: River Gauge</h3>
          <div style={{ height: '350px', marginTop: '15px' }}>
            {/* Reusing existing logic with custom test props */}
            <RiverLevel currentLevel={6.5} predictedLevel={7.2} />
          </div>
        </div>

        {/* Component Instance 2: Table */}
        <div style={{ 
          flex: 1, 
          minWidth: '500px', 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)' 
        }}>
          <h3 style={{ marginTop: 0 }}>Instance 2: History Tab</h3>
          <div style={{ marginTop: '15px' }}>
            <HistoryTab />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPage;