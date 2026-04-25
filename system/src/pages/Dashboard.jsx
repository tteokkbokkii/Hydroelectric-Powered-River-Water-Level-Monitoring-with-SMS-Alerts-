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
  
  const previousRangeRef = useRef(null);

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_BASE}/data`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setWaterData(data);
        if (data.length > 0) {
          // FIX: Grab the LAST item in the array, which is the newest reading!
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

  useEffect(() => {
    if (latestReading && latestReading.range) {
      const currentRange = latestReading.range;

      if (previousRangeRef.current === null) {
        console.log("Dashboard Loaded. Baseline set to:", currentRange);
        previousRangeRef.current = currentRange;
        return; 
      }

      const previousRange = previousRangeRef.current;

      if (currentRange !== previousRange) {
        console.log(`State Changed! Previous: ${previousRange} | Current: ${currentRange}`);
        
        // --- STRICT ESCALATION CHECK ---
        if (previousRange === "SAFE" && currentRange === "WARNING") {
          window.alert("⚠️ ALERT: Water level escalated to WARNING!");
        } 
        else if ((previousRange === "WARNING" || previousRange === "SAFE") && currentRange === "CRITICAL") {
          window.alert("🚨 CRITICAL: Water level escalated to CRITICAL! Immediate action required!");
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