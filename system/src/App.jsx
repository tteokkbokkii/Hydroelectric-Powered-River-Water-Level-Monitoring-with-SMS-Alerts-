import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import Announcement from './components/Announcement.jsx'
import RiverLevel from "./components/features/RiverLevel.jsx";
import RiverTrend from './components/features/RiverTrend.jsx'
import RecentLogs from './components/features/RecentLogs.jsx'
import SystemTab from './components/features/SystemTab.jsx';
import HistoryTab from './components/features/HistoryTab.jsx';
import {HashRouter as Router, Routes, Route} from 'react-router-dom'
import Contacts from './pages/Contacts'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import System from './pages/System'
import HandshakeCheck from './components/HandshakeCheck.jsx';
import TestPage from './pages/TestPage.jsx';

function App() {
    return (
        <>
            <Router>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path='/Dashboard' element={<Dashboard/>}/>
                    <Route path='/Contacts' element={<Contacts/>}/>
                    <Route path='/History' element={<History/>}/>
                    <Route path='/System' element={<System/>}/>
                    <Route path='/TestPage' element={<TestPage/>}/>
                </Routes>
            </Router>
            {
                /*<HandshakeCheck/>*/
            }
        </>
    ); // Added the missing semicolon and ensured the brace is closed below
}


export default App