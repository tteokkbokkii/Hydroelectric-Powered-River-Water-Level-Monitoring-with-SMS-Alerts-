import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import Announcement from '../components/Announcement.jsx'
import SystemTab from '../components/features/SystemTab.jsx'

function System(){
    return(
      <>
        <Header/>
        <Announcement/>
        <SystemTab/>
        <Footer/>
      </>
    )
}

export default System