import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Announcement from './components/Announcement.jsx'
import LiveWaterLevel from './components/LiveWaterLevel.jsx'
import Card from './components/card.jsx'
import RiverLevel from "./components/features/RiverLevel.jsx";
import RiverTrend from './components/features/RIverTrend.jsx'
import RecentLogs from './components/features/RecentLogs.jsx'

function App() {
    return(
      <>
        <Header/>
        <Announcement/>
        <div className='dashboard-grid'>
          <RiverLevel/>
          <RiverTrend/>
          <RecentLogs/>
        </div>
        <Footer/>
      </>
    )
}

export default App
