import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Announcement from './components/Announcement.jsx'
import RiverLevel from "./components/features/RiverLevel.jsx";
import RiverTrend from './components/features/RiverTrend.jsx'
import RecentLogs from './components/features/RecentLogs.jsx'
import TabContainer from './components/TabContainer.jsx';
import HistoryTab from './components/features/HistoryTab.jsx';

function App() {
    return(
      <>
        <Header/>
        <Announcement/>
        <HistoryTab/>
      </>
    )
}

export default App
