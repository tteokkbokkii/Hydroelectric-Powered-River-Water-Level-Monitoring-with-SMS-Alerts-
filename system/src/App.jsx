import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import GlobalLayout from './components/GlobalLayout.jsx';
import Dashboard from './pages/Dashboard'
import Contacts from './pages/Contacts'
import History from './pages/History'
import System from './pages/System'
import TestPage from './pages/TestPage.jsx';

function App() {
    return (
        <Router>
            <GlobalLayout>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path='/Dashboard' element={<Dashboard/>}/>
                    <Route path='/Contacts' element={<Contacts/>}/>
                    <Route path='/History' element={<History/>}/>
                    <Route path='/System' element={<System/>}/>
                    <Route path='/TestPage' element={<TestPage/>}/>
                </Routes>
            </GlobalLayout>
        </Router>
    );
}

export default App; 