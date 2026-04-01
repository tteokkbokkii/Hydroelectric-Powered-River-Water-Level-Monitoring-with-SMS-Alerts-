import { useState, useEffect } from 'react';
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import Announcement from '../components/Announcement.jsx'
import RiverLevel from "../components/features/RiverLevel.jsx";
import RiverTrend from '../components/features/RiverTrend.jsx'
import RecentLogs from '../components/features/RecentLogs.jsx'

function Dashboard(){
    const [waterData, setWaterData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // UPDATE: Use the IP your Flask app just gave you (192.168.43.154)
                // Use /api/data to match your Flask route
                const response = await fetch('http://192.168.43.154:5000/api/data');
                const data = await response.json();
                
                console.log("Data received:", data); // Check your F12 console for this!
                setWaterData(data); 
            } catch (error) {
                console.error("Database Fetch Error:", error);
            }
        };

        fetchData(); 
        const interval = setInterval(fetchData, 3000); 
        return () => clearInterval(interval); 
    }, []);

    // FIX: Change .value to .distance_ft to match your SQLite column
    const latestLevel = waterData.length > 0 ? waterData[0].distance_ft : 0;
    const latestPredicted = waterData.length > 0 ? waterData[0].predicted_level : 0;

    return(
      <>
        <Header/>
        <Announcement/>
        <div className="main-content">
          <div className='dashboard-grid'>
            {/* Pass the corrected data down */}
            <RiverLevel 
                currentLevel={latestLevel} 
                predictedLevel={latestPredicted} 
            />
            <RiverTrend history={waterData} />
            <RecentLogs logs={waterData} />
          </div>
        </div>
        <Footer/>
      </>
    )
}

export default Dashboard