import React from 'react';
import { Link } from 'react-router-dom';

function RecentLogs({ logs }) {
  return (
    <div
      className="card-container"
      id="recentlogs"
    >
      <h2 className="card-title">RECENT LOGS</h2>
      <div
        className="innercard-container"
        id="recentlogs-contents"
      >
        <Link to="/history" style={{ display: 'contents', textDecoration: 'none', color: 'inherit' }}>
          {logs.length === 0 && (
            <p className="loading-text">Waiting for database entries...</p>
          )}

          {[...logs].map((log, index) => {
            // Mapping variables to the unified keys from Flask API
            const value = log.distance || 0;
            const time = (log.time && log.time !== "None") ? log.time : '--:--';
            const status = log.range || 'UNKNOWN';

            return (
              <p
                key={log.id || `${time}-${index}-${value}`}
                className={`log-entry ${status.toLowerCase()}`}
              >
                <span className="log-time">
                  [{time}]
                </span>
                {' - '}
                <span className="log-status">
                  [{status}]
                </span>
                {' '}
                <span className="log-value">
                  WATER ELEVATION: {(parseFloat(value) || 0).toFixed(2)} FT.
                </span>
              </p>
            );
          })}
        </Link>
      </div>
    </div>
  );
}

export default RecentLogs;