import React, { useState, useEffect, useRef } from 'react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import Announcement from './Announcement.jsx';
import Popup from './Popup.jsx';
import '../styles/Popups.css';

const currentIP = window.location.hostname || 'rivermonitoring.local';
const API_BASE = `http://${currentIP}:5000/api`;
const POLL_INTERVAL = 2000;

export default function GlobalLayout({ children }) {
  const [latestReading, setLatestReading] = useState(null);
  const [popup, setPopup] = useState({ visible: false, message: '', severity: '', buttons: [] });
  const previousRangeRef = useRef(null);
  const custom31TriggeredRef = useRef(false);

  const showPopup = (message, severity) => {
    setPopup({ visible: true, message, severity });
  };

  // One central fetcher for the whole app's emergency logic
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const response = await fetch(`${API_BASE}/data`);
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const newest = data[0];
          
          // STRICT ESCALATION CHECK
          if (previousRangeRef.current !== null && newest.range !== previousRangeRef.current) {
            if (previousRangeRef.current === "SAFE" && newest.range === "WARNING") {
              showPopup("Water has reached the WARNING threshold! Please prepare.", "warn");
            } else if (newest.range === "CRITICAL" && previousRangeRef.current !== "CRITICAL") {
              showPopup("Water has reached the CRITICAL threshold! Immediate action required!", "error");
            }
          }
          previousRangeRef.current = newest.range;

          // GENBOX 10 FT CUSTOM CHECK
          if (newest.distance > 10.0 && !custom31TriggeredRef.current) {
            showPopup("Notice: River level has exceeded 10 ft. \nPlease slide the frame up.", "error");
            custom31TriggeredRef.current = true;
          } else if (newest.distance <= 10.0 && custom31TriggeredRef.current) {
            custom31TriggeredRef.current = false;
          }

          setLatestReading(newest);
        }
      } catch (e) { console.error("Global monitor error:", e); }
    };

    fetchLatest();
    const interval = setInterval(fetchLatest, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-shell">
      <Header />
      <Announcement />
      <main className="main-content">{children}</main>
      <Footer />
      {popup.visible && (
        <Popup 
          message={popup.message} 
          severity={popup.severity} 
          onClose={() => setPopup({ ...popup, visible: false })} 
        />
      )}
    </div>
  );
}