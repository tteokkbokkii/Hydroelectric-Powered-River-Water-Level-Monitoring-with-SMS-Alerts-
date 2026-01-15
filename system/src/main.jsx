import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import './styles/Header.css'
import './styles/Footer.css'
import './styles/Announcement-Bar.css'
import './styles/Card.css'
import './styles/TabContainer.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App/>
  </StrictMode>,
)
