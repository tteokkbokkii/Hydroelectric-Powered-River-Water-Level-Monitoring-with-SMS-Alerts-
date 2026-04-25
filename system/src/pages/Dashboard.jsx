import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import Announcement from '../components/Announcement.jsx'
import RiverLevel from "../components/features/RiverLevel.jsx";
import RiverTrend from '../components/features/RiverTrend.jsx'
import RecentLogs from '../components/features/RecentLogs.jsx'

const currentIP = window.location.hostname || 'rivermonitoring.local';
const API_BASE = `http://${currentIP}:5000/api`;
const POLL_INTERVAL = 2000; // 2 seconds

function Dashboard() {
  const [waterData, setWaterData] = useState([]);
  const [latestReading, setLatestReading] = useState(null);
  
  // 1. Initialize as null so it doesn't trigger on the very first page load
  const previousRangeRef = useRef(null);

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_BASE}/data`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setWaterData(data);
        if (data.length > 0) {
          setLatestReading(data[0]); // newest first
        }
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // 2. POPUP LOGIC: Only trigger on actual escalations while the page is open
  useEffect(() => {
    if (latestReading && latestReading.range) {
      const currentRange = latestReading.range;

      // If this is the very first time the page loads, just set the baseline and stop.
      if (previousRangeRef.current === null) {
        previousRangeRef.current = currentRange;
        return; 
      }

      const previousRange = previousRangeRef.current;

      // Check if the range has changed
      if (currentRange !== previousRange) {
        
        // --- STRICT ESCALATION CHECK ---
        
        // Escalation 1: Safe to Warning
        if (previousRange === "SAFE" && currentRange === "WARNING") {
          window.alert("⚠️ ALERT: Water level escalated to WARNING!");
        } 
        // Escalation 2: Warning to Critical (or directly Safe to Critical)
        else if ((previousRange === "WARNING" || previousRange === "SAFE") && currentRange === "CRITICAL") {
          window.alert("🚨 CRITICAL: Water level escalated to CRITICAL! Immediate action required!");
        }

        // Update the baseline memory to the new current range
        previousRangeRef.current = currentRange;
      }
    }
  }, [latestReading]);

  return (
    <>
      <Header/>
      <Announcement/>
      <div className="main-content">
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
    </>
  );
}

export default Dashboard;