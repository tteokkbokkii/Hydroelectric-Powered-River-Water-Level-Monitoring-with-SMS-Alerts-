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
  
  // Memory to track the previous state so we only popup when it CHANGES
  const previousRangeRef = useRef(null);

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_BASE}/data`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setWaterData(data);
        if (data.length > 0) {
          // Grab the LAST item in the array (the newest reading from your database)
          const newest = data[data.length - 1]; 
          setLatestReading(newest); 
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

  // --- STRICT ESCALATION POPUP LOGIC ---
  useEffect(() => {
    if (latestReading && latestReading.range) {
      const currentRange = latestReading.range;

      // On first load, quietly learn the current state without spamming a popup
      if (previousRangeRef.current === null) {
        console.log("Dashboard Loaded. Baseline set to:", currentRange);
        previousRangeRef.current = currentRange;
        return; 
      }

      const previousRange = previousRangeRef.current;

      // Only evaluate if the range actually changed
      if (currentRange !== previousRange) {
        console.log(`Floater Change Detected! Previous: ${previousRange} | Current: ${currentRange}`);
        
        // 1. ESCALATION: Safe to Warning
        if (previousRange === "SAFE" && currentRange === "WARNING") {
          window.alert("⚠️ WARNING: Water has reached the WARNING threshold! Middle floater switch triggered. Please prepare.");
        } 
        // 2. ESCALATION: Safe or Warning escalating to Critical
        else if ((previousRange === "SAFE" || previousRange === "WARNING") && currentRange === "CRITICAL") {
          window.alert("🚨 CRITICAL ALERT: Water has reached the CRITICAL threshold! Top floater switch triggered. Immediate evacuation/action required!");
        }

        // Always update the dashboard's memory so the new baseline is saved
        // This ensures de-escalations (like Critical down to Safe) are remembered silently
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