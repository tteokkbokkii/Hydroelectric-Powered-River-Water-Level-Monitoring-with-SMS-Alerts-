import { useState, useEffect } from 'react';
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import Announcement from '../components/Announcement.jsx'
import RiverLevel from "../components/features/RiverLevel.jsx";
import RiverTrend from '../components/features/RiverTrend.jsx'
import RecentLogs from '../components/features/RecentLogs.jsx'

const currentIP = window.location.hostname || 'hulo.local';
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