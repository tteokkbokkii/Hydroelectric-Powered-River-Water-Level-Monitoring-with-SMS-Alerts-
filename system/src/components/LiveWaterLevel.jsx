import React, { useState, useEffect } from 'react';

function LiveWaterLevel() {
    const [expectedLevel, setExpectedLevel] = useState(9.50);
    const [time, setTime] = useState(0);

    const minLevel = 5;
    const maxLevel = 12.5;

    // Simulation Logic
    useEffect(() => {
        const interval = setInterval(() => {
            setTime((t) => t + 0.001);
            setExpectedLevel((prev) => {
                const move = 9.75 + (0.75 * Math.cos(time * 0.5));
                return parseFloat(move.toFixed(2));
            });
        }, 50);
        return () => clearInterval(interval);
    }, [time]);

    const currentLevel = 8.5 + (3 * Math.sin(time));

    // Dynamic Placement Calculations
    const currentPercent = ((currentLevel - minLevel) / (maxLevel - minLevel)) * 100;
    const expectedPercent = ((expectedLevel - minLevel) / (maxLevel - minLevel)) * 100;

    // Helper for Ruler Ticks
    const ticks = [12, 11.5, 11, 10.5, 10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5];

    return (
        <div className='card' id='livewaterlevel'>
            <h2 className='cardtitle'>LIVE LEVEL OF RIVER WATER</h2>
            
            <div className='innercard' id='livewaterlevel-inner'>
                
                {/* 1. EXPECTED LAYER (Light Blue Zone) */}
                <div 
                    className="expected-water" 
                    style={{ height: `${expectedPercent}%` }}
                >
                    <div className="floating-label expected">
                        <span className="label">EXPECTED</span>
                        <span className="value">{expectedLevel.toFixed(2)} ft.</span>
                    </div>
                </div>

                {/* 2. CURRENT LAYER (Solid Blue Water) */}
                <div 
                    className="water-bg" 
                    style={{ height: `${currentPercent}%` }}
                >
                    <div className="water-surface"></div>
                    <div className="floating-label current">
                        <span className="label">CURRENT</span>
                        <span className="value">{currentLevel.toFixed(2)} ft.</span>
                    </div>
                </div>

                {/* 3. CONTENT LAYER (Ruler and Status) */}
                <div className="content-layer">
                    <div className="side-panel left"></div>
                    
                    <div className='gauge-container'>
                        <div className='ruler-vertical-line'>
                            {ticks.map((val) => {
                                const pos = ((val - minLevel) / (maxLevel - minLevel)) * 100;
                                return (
                                    <div 
                                        key={val} 
                                        className={`tick ${val % 1 === 0 ? 'major' : 'minor'}`}
                                        style={{ bottom: `${pos}%` }}
                                    >
                                        {val % 1 === 0 && <span className="tick-number">{val} ft.</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="side-panel right">
                        <p className={`status-text ${currentLevel >= 11 ? 'active' : ''}`}>EXTREMELY CRITICAL</p>
                        <p className={`status-text ${currentLevel >= 9.5 && currentLevel < 11 ? 'active' : ''}`}>HIGHLY CRITICAL</p>
                        <p className={`status-text ${currentLevel >= 8 && currentLevel < 9.5 ? 'active' : ''}`}>NEEDS ATTENTION</p>
                        <p className={`status-text ${currentLevel < 8 ? 'active' : ''}`}>NORMAL THRESHOLD</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LiveWaterLevel;