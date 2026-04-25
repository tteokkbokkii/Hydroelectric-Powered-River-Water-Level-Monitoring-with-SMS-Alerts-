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
  
  // 1. ADD A "MEMORY" TO TRACK THE PREVIOUS RANGE
  const previousRangeRef = useRef("SAFE");

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_BASE}/data`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setWaterData(data);
        if (data.length > 0) {
          setLatestReading(data[0]); // newest first
          console.log("Latest reading:", data[0]);
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

  // 2. ADD THE POPUP LOGIC TO WATCH FOR CHANGES
  useEffect(() => {
    // Make sure we actually have data before checking
    if (latestReading && latestReading.range) {
      const currentRange = latestReading.range;
      const previousRange = previousRangeRef.current;

      // Only trigger if the state actually changed
      if (currentRange !== previousRange) {
        
        // Reminder: The ESP32 sends "WARNING", not "NEEDS ATTENTION"
        if (currentRange === "WARNING") {
          window.alert("⚠️ ALERT: Water level NEEDS ATTENTION!");
        } 
        else if (currentRange === "CRITICAL") {
          window.alert("🚨 CRITICAL: Evacuation or immediate action required!");
        } 
        else if (currentRange === "SAFE" && previousRange !== "SAFE") {
          // Optional: Tell them when it goes back down to safe
          window.alert("✅ CLEAR: Water level has returned to SAFE.");
        }

        // Update the memory so it doesn't spam you every 2 seconds
        previousRangeRef.current = currentRange;
      }
    }
  }, [latestReading]); // This effect runs every time a new reading comes in

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