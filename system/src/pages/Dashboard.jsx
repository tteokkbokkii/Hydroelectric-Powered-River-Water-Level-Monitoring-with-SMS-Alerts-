import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import Announcement from '../components/Announcement.jsx';
import RiverLevel from "../components/features/RiverLevel.jsx";
import RiverTrend from '../components/features/RiverTrend.jsx';
import RecentLogs from '../components/features/RecentLogs.jsx';

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
      // Safely handling the network error without referencing undefined variables
      console.error("Live Data Check -> Error fetching live data from Flask API:", error);
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
      <Header />
      <Announcement />
      
      <div className="main-content">
        <div className="dashboard-grid">
          <RiverLevel
            currentLevel={latestReading?.distance || 0}
            predictedLevel={latestReading?.predicted || 0}
          />
          <RiverTrend history={waterData} />
          <RecentLogs logs={waterData} />
        </div>
      </div>

      <Footer />
      
      {popup.visible && (
        <Popup message={popup.message} severity={popup.severity} buttons={popup.buttons} onClose={closePopup} />
      )}
    </>
  );
}

export default Dashboard;