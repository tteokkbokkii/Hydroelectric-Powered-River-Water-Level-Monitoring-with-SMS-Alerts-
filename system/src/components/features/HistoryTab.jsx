import TabContainer from "../TabContainer.jsx";

const HistoryTab = () => {
  // Define the tabs for history
  const historyTabs = [
    { 
      label: 'DAILY LOGS', 
      content: <p>Displaying water level logs for the last 24 hours...</p> 
    },
    { 
      label: 'SMS ALERTS', 
      content: <p>List of all emergency alerts sent to authorities.</p> 
    }
  ];

  return (
    <div className="history-page">
      <TabContainer 
        cardTitle="SYSTEM HISTORY" 
        tabs={historyTabs} 
      />
    </div>
  );
};

export default HistoryTab;