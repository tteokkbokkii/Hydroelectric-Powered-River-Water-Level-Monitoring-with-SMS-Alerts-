import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import Announcement from '../components/Announcement.jsx'
import RiverLevel from "../components/features/RiverLevel.jsx";
import RiverTrend from '../components/features/RiverTrend.jsx'
import RecentLogs from '../components/features/RecentLogs.jsx'

function Dashboard(){
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

export default Dashboard