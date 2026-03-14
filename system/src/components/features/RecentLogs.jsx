import { useState, useEffect } from 'react';

function RecentLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/monitorData.json');
        const data = await response.json();
        const recent = data.slice(-19).reverse();
        setLogs(recent);
      } catch (error) {
        console.error('Error loading monitor data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className='card-container' id='recentlogs'>
      <h2 className='card-title'>RECENT LOGS</h2>
      <div className='innercard-container' id='recentlogs-contents'>
        {logs.map((log, index) => (
          <p key={index}>
            [{log.time}] - [{log.range}] WATER ELEVATION: {log.distance.toFixed(2)} ft.
          </p>
        ))}
      </div>
    </div>
  );
}

export default RecentLogs;