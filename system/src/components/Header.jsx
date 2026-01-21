import { useState, useEffect, useRef} from 'react';
import { Link } from 'react-router-dom';
import logo from "../assets/logo.png";
function Header(){
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const [time, setTime] = useState(new Date());
    useEffect(() => {
            const timer = setInterval(() => {
                setTime(new Date());
            }, 1000);
            return () => clearInterval(timer);
        }, []);

    const dateNtime = new Date();
    const mm = String(dateNtime.getMonth() + 1).padStart(2, '0');
    const dd = String(dateNtime.getDate()).padStart(2, '0');
    const yy = String(dateNtime.getFullYear()).slice(-2);
    const formattedDate = `${mm}/${dd}/${yy}`;

    const hh = String(dateNtime.getHours()).padStart(2, '0');
    const min = String(dateNtime.getMinutes()).padStart(2, '0');
    const ss = String(dateNtime.getSeconds()).padStart(2, '0');
    const formattedTime = `${hh}:${min}:${ss}`;

    {/*
        Date could be deleted and fetched from rtc module but mas better ata na gawin ganito and i-crosscheck, bali yung rtc mag-a-adjust or calibrate if i doesn't match this    
    */}

return(
        <header className='header-container'>
            <a href="#"><img src={logo} alt="Ferry Station Logo" className='logo'/></a>
            <a href="#" id='title'><h1>HULO FERRY STATION</h1></a>

            <div className='date-time-container'>
                <p className='date'>{formattedDate}</p>
                <p className='time'>{formattedTime}</p>
            </div>
            
            <nav 
                ref={menuRef}
                className={`navigation-container ${isOpen ? 'active' : ''}`} 
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className='dropdown'>
                    <button className='menu-button'>
                        <div className='bar'></div>
                        <div className='bar'></div>
                        <div className='bar'></div>
                    </button>
                   
                <div className='contents'>
                    <Link to="/Dashboard">DASHBOARD</Link>
                    <Link to="/History">HISTORY</Link>
                    <Link to="/Contacts">CONTACTS</Link>
                    <Link to="/System">SYSTEM</Link>
                </div>
                </div>
            </nav>
        </header>
    );
}

export default Header