import React, { useState } from 'react';

function LiveWaterLevel() {
    // ESP32 DATA PLACEHOLDERS: 
    // You will update these values when your ESP32 sends new data
    const [currentLevel, setCurrentLevel] = useState(6.70); 
    const [expectedLevel, setExpectedLevel] = useState(7.00);

    // DYNAMIC CALCULATION:
    // This maps the 5ft-12ft range to a 0-100% height for the CSS
    const minLevel = 5;
    const maxLevel = 12;
    const waterHeightPercent = ((currentLevel - minLevel) / (maxLevel - minLevel)) * 100;

    return (
        <>
            <div className='card' id='livewaterlevel'>
                <h2 className='cardtitle'>LIVE LEVEL OF RIVER WATER</h2>

                <div className='innercard' id='livewaterlevel-inner'>
                    
                    {/* LEFT SIDE: Data Readouts */}
                    <div className="data-readout">
                        <div className="expected-box">
                            <span className="label">EXPECTED</span>
                            <span className="value">{expectedLevel.toFixed(2)} ft.</span>
                        </div>
                        <div className="current-box">
                            <span className="label">CURRENT</span>
                            <span className="value">{currentLevel.toFixed(2)} ft.</span>
                        </div>
                    </div>

                    {/* CENTER: The Gauge Ruler */}
                    <div className='gauge'>
                        {/* The Blue Water Fill that rises/falls */}
                        <div 
                            className="water-fill" 
                            style={{ height: `${waterHeightPercent}%` }}
                        ></div>

                        {/* Ruler Markings */}
                        {[12, 11, 10, 9, 8, 7, 6, 5].map((val) => (
                            <div key={val} className="ruler-step">
                                <div className="line"></div>
                                <span className="number">{val} ft.</span>
                            </div>
                        ))}
                    </div>

                    {/* RIGHT SIDE: Status Labels */}
                    <div className="status-labels">
                        <p>EXTREMELY CRITICAL</p>
                        <p>HIGHLY CRITICAL</p>
                        <p>NEEDS ATTENTION</p>
                        <p className="active">NORMAL THRESHOLD</p>
                    </div>

                </div>
            </div>
        </>
    );
}

export default LiveWaterLevel;