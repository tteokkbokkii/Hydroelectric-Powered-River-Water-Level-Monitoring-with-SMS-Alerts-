import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import Announcement from '../components/Announcement.jsx'
import HistoryTab from '../components/features/HistoryTab.jsx'

function History(){
    return(
      <>
        <Header/>
        <Announcement/>
        <div className="history-page-wrapper" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <HistoryTab/>
        </div>
        <Footer/>
      </>
    )
}

export default History