import React from 'react';

// Notice we are accepting { logs } as a prop from Dashboard.jsx now
function RecentLogs({ logs }) {
  
  // This helper function handles the color/text logic based on your feet thresholds
  const getRange = (feet) => {
    if (feet >= 11.5) return "CRITICAL";
    if (feet >= 9.0) return "WARNING";
    return "NORMAL";
  };

  return (
    <div className='card-container' id='recentlogs'>
      <h2 className='card-title'>RECENT LOGS</h2>
      <div className='innercard-container' id='recentlogs-contents'>
        {/* If there's no data yet, show a loading message */}
        {logs.length === 0 && <p>Waiting for database entries...</p>}

        {logs.map((log, index) => {
          // log.value is the level, log.time is the timestamp from SQLite
          const feet = log.value; 
          const range = getRange(feet);
          
          return (
            <p key={log.id || index}>
              [{log.time}] - [{range}] WATER ELEVATION: {feet.toFixed(2)} ft.
            </p>
          );
        })}
      </div>
    </div>
  );
}

export default RecentLogs;