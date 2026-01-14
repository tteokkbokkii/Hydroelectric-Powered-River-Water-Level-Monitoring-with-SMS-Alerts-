
function RecentLogs(){
    return(
        <div className='card-container' id='recentlogs'>
            <h2 className='card-title'>RECENT LOGS</h2>
            <div className='innercard-container' id='recentlogs-contents'>
                <p>[XX:XX:XX] - [TYPE] WATER ELEVATION: {/*Some Value*/} | {/*REPRESENTATION*/}</p>
                <p>[XX:XX:XX] - [TYPE] WATER ELEVATION: {/*Some Value*/} | {/*REPRESENTATION*/}</p>
                <p>[XX:XX:XX] - [TYPE] WATER ELEVATION: {/*Some Value*/} | {/*REPRESENTATION*/}</p>
                <p>[XX:XX:XX] - [TYPE] WATER ELEVATION: {/*Some Value*/} | {/*REPRESENTATION*/}</p>

            </div>
        </div>
    );
}

export default RecentLogs