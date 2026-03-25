import { useState, useEffect } from 'react'; // Added hooks
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import Announcement from '../components/Announcement.jsx'
import RiverLevel from "../components/features/RiverLevel.jsx";
import RiverTrend from '../components/features/RiverTrend.jsx'
import RecentLogs from '../components/features/RecentLogs.jsx'

function Dashboard(){
    const [waterData, setWaterData] = useState([]); // Storage for DB data

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Use your Laptop IP (192.168.1.85) so the ESP32 can also see it
                const response = await fetch('http://192.168.1.85:5000/api/history');
                const data = await response.json();
                setWaterData(data); // Put the DB rows into our state
            } catch (error) {
                console.error("Database Fetch Error:", error);
            }
        };

        fetchData(); // Run once on load
        const interval = setInterval(fetchData, 3000); // Auto-refresh every 3 seconds
        return () => clearInterval(interval); // Clean up on close
    }, []);

    // We take the VERY FIRST row as the "Current" level
    const latestLevel = waterData.length > 0 ? waterData[0].value : 0;

    return(
      <>
        <Header/>
        <Announcement/>
        <div className="main-content">
          <div className='dashboard-grid'>
            {/* Pass the data down as "Props" */}
            <RiverLevel currentLevel={latestLevel} />
            <RiverTrend history={waterData} />
            <RecentLogs logs={waterData} />
          </div>
        </div>
        <Footer/>
      </>
    )
}

export default Dashboard