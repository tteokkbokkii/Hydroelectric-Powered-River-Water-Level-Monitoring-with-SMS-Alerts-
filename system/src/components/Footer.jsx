
function Footer(){
    return(
        <footer className='footer-container'>
            <div className='system-status'>
                <p>SYSTEM STATUS: {/*Some Value*/}</p>
            </div>
            <div className='gsm-signal'></div> 
            <div className='battery'></div>
        </footer>
    );
}

export default Footer