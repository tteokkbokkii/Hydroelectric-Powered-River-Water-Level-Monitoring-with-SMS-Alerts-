import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import Announcement from '../components/Announcement.jsx'
import ContactsTab from '../components/features/ContactsTab.jsx'

function Contacts(){
    return(
      <>
        <Header/>
        <Announcement/>
        <HistoryTab/>
        <Footer/>
      </>
    )
}

export default Contacts