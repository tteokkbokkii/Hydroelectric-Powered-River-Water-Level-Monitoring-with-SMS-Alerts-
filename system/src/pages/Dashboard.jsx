import React, { useState, useEffect } from 'react';
import RiverLevel from "../components/features/RiverLevel.jsx";
import RiverTrend from '../components/features/RiverTrend.jsx';
import RecentLogs from '../components/features/RecentLogs.jsx';

const currentIP = window.location.hostname || 'rivermonitoring.local';
const API_BASE = `http://${currentIP}:5000/api`;
const POLL_INTERVAL = 2000; // 2 seconds

function Dashboard() {
  const [waterData, setWaterData] = useState([]);
  const [latestReading, setLatestReading] = useState(null);

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_BASE}/data`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setWaterData(data); // Feeds the RiverTrend chart and RecentLogs table
        if (data.length > 0) {
          const newest = data[0]; 
          setLatestReading(newest); // Feeds the RiverLevel gauge
        }
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    }
  };

  // Polls the database every 2 seconds to keep the dashboard live
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className='dashboard-grid'>
      <RiverLevel
        currentLevel={latestReading?.distance || 0}
        predictedLevel={latestReading?.predicted || 0}
      />
      <RiverTrend history={waterData} />
      <RecentLogs logs={waterData} />
    </div>
  );
}

export default Dashboard;