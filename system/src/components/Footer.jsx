
function Footer() {
    return (
        <footer className='footer-container'>
            <div className='system-status'>
                <p>SYSTEM STATUS: <span style={{color: '#0072CE'}}>NORMAL</span></p>
            </div>
            <div className='gsm-signal'></div> 
            <div className='battery'></div>
        </footer>
    );
}

export default Footer;