import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import Announcement from '../components/Announcement.jsx'
import RiverLevel from "../components/features/RiverLevel.jsx";
import RiverTrend from '../components/features/RiverTrend.jsx'
import RecentLogs from '../components/features/RecentLogs.jsx'

// --- Generic Popup Component (Imported from your System setup) ---
const Popup = ({ message, severity, onClose, buttons = [{ label: 'OK', onClick: null }] }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleButtonClick = (btn) => {
    if (btn.onClick) btn.onClick();
    onClose();
  };

  return ReactDOM.createPortal(
    <div className="notification-overlay" onClick={onClose}>
      <div className={`notification-card ${severity}`} onClick={(e) => e.stopPropagation()}>
        <button className="notification-close-x" onClick={onClose}>×</button>
        <div className="notification-header">
          <h3>{severity === 'error' ? '🚨 CRITICAL ALERT' : severity === 'warn' ? '⚠️ WARNING' : 'ℹ️ INFORMATION'}</h3>
        </div>
        <div className="notification-body">
          <p>{message}</p>
        </div>
        <div className="notification-footer">
          {buttons.map((btn, idx) => (
            <button
              key={idx}
              className={idx === 0 ? "notification-primary-btn" : "notification-secondary-btn"}
              onClick={() => handleButtonClick(btn)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

const currentIP = window.location.hostname || 'rivermonitoring.local';
const API_BASE = `http://${currentIP}:5000/api`;
const POLL_INTERVAL = 2000; // 2 seconds

function Dashboard() {
  const [waterData, setWaterData] = useState([]);
  const [latestReading, setLatestReading] = useState(null);
  
  // Custom Popup State
  const [popup, setPopup] = useState({ visible: false, message: '', severity: '', buttons: [] });
  
  // Memory to track the previous state
  const previousRangeRef = useRef(null);

  // Popup Handlers
  const showPopup = (message, severity, buttons = [{ label: 'I UNDERSTAND', onClick: null }]) => {
    setPopup({ visible: true, message, severity, buttons });
  };
  const closePopup = () => {
    setPopup({ visible: false, message: '', severity: '', buttons: [] });
  };

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_BASE}/data`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setWaterData(data);
        if (data.length > 0) {
          const newest = data[0];  
          setLatestReading(newest); 
        }
      }
    } catch (error) {
      console.log(`Live Data Check -> Elevation: ${newest.elevation}, Range: ${newest.range}`);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // --- STRICT ESCALATION POPUP LOGIC ---
  useEffect(() => {
    if (latestReading && latestReading.range) {
      const currentRange = latestReading.range;

      if (previousRangeRef.current === null) {
        previousRangeRef.current = currentRange;
        console.log("Initial Dashboard Baseline set to:", currentRange);
        return; 
      }

      const previousRange = previousRangeRef.current;

      // Only evaluate if the range actually changed
      if (currentRange !== previousRange) {
        console.log(`State Changed! Escaped from ${previousRange} to ${currentRange}`);
        
        // 1. ESCALATION: Safe to Warning
        if (previousRange === "SAFE" && currentRange === "WARNING") {
          showPopup(
            "Water has reached the WARNING threshold! Please prepare.",
            "warn"
          );
        } 
        // 2. ESCALATION: Safe or Warning escalating to Critical
        else if ((previousRange === "SAFE" || previousRange === "WARNING") && currentRange === "CRITICAL") {
          showPopup(
            "Water has reached the CRITICAL threshold, Immediate evacuation/action required!", 
            "warn"
          );
        }

        previousRangeRef.current = currentRange;
      }
    }
  }, [latestReading]);

  return (
    <>
      <Header/>
      <Announcement/>
      <div className="main-content">
        
        {/* If your popup CSS isn't global yet, we inject it here just like in toast.txt */}
        <style>{`
          .notification-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 9999; animation: fadeIn 0.2s ease-in; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .notification-card { position: relative; background: white; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); width: 90%; max-width: 400px; animation: slideUp 0.3s ease-out; }
          @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          .notification-close-x { position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 24px; cursor: pointer; color: #666; line-height: 1; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.2s; }
          .notification-close-x:hover { background: #f0f0f0; color: #333; }
          .notification-header { padding: 20px 20px 0 20px; border-bottom: 1px solid #eef2f6; }
          .notification-header h3 { margin: 0; font-size: 1.2rem; font-weight: bold; font-family: InterBlack, sans-serif; text-transform: uppercase; }
          .notification-card.error .notification-header h3 { color: #dc2626; }
          .notification-card.warn .notification-header h3 { color: #f59e0b; }
          .notification-card.info .notification-header h3 { color: #002D5A; }
          .notification-card.success .notification-header h3 { color: #10b981; }
          .notification-body { padding: 20px; text-align: center; font-size: 1.1rem; line-height: 1.5; color: #333; font-family: InterMedium, sans-serif; }
          .notification-footer { padding: 0 20px 20px 20px; display: flex; justify-content: center; gap: 10px; }
          .notification-primary-btn, .notification-secondary-btn { background-color: #002D5A; color: white; border: none; border-radius: 6px; padding: 10px 24px; font-weight: bold; cursor: pointer; font-family: InterMedium, sans-serif; transition: background 0.2s; width: 100%; }
          .notification-primary-btn:hover { background-color: #005bb5; }
        `}</style>

        <div className='dashboard-grid'>
          <RiverLevel
            currentLevel={latestReading?.distance || 0}
            predictedLevel={latestReading?.predicted || 0}
          />
          <RiverTrend history={waterData} />
          <RecentLogs logs={waterData} />
        </div>
      </div>
      <Footer/>

      {/* Render the Popup here if it's triggered */}
      {popup.visible && (
        <Popup message={popup.message} severity={popup.severity} buttons={popup.buttons} onClose={closePopup} />
      )}
    </>
  );
}

export default Dashboard;