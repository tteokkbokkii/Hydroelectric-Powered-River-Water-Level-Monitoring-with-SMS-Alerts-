import {HashRouter as Router, Routes, Route} from 'react-router-dom'
import GlobalStateProvider from './components/features/GlobalStateProvider.jsx';
import Contacts from './pages/Contacts'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import System from './pages/System'
// import HandshakeCheck from './components/HandshakeCheck.jsx';
import TestPage from './pages/TestPage.jsx';

function App() {
    return (
        <>
            <Router>
                <GlobalStateProvider>
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path='/Dashboard' element={<Dashboard/>}/>
                        <Route path='/Contacts' element={<Contacts/>}/>
                        <Route path='/History' element={<History/>}/>
                        <Route path='/System' element={<System/>}/>
                        <Route path='/TestPage' element={<TestPage/>}/>
                    </Routes>
                </GlobalStateProvider>
            </Router>
            {
                /*<HandshakeCheck/>*/
            }
        </>
    );
}


export default App