import React, { useState, useEffect, useRef, createContext } from 'react';
import Popup from "./Popup.jsx";

const currentIP = window.location.hostname || 'rivermonitoring.local';
const API_BASE = `http://${currentIP}:5000/api`;
const POLL_INTERVAL = 2000;
const usonic_genbox_dist = 10;

// 1. Export the context so SystemTab can use it
export const GlobalContext = createContext();

export default function GlobalStateProvider({ children }) {
    const [latestReading, setLatestReading] = useState(null);
    const [popup, setPopup] = useState({ visible: false, message: '', severity: '', buttons: [] });
    const [popupSettings, setPopupSettings] = useState({ attention: true, critical: true });
    const popupSettingsRef = useRef(popupSettings);
    
    useEffect(() => {
        popupSettingsRef.current = popupSettings;
    }, [popupSettings]);

    const previousRangeRef = useRef(null);
    const custom31TriggeredRef = useRef(false);

    const showPopup = (message, severity) => {
        setPopup({ visible: true, message, severity });
    };

    useEffect(() => {
        const fetchLatest = async () => {
            try {
                const response = await fetch(`${API_BASE}/data`);
                const data = await response.json();
                
                if (Array.isArray(data) && data.length > 0) {
                    const newest = data[0];
                
                // NON-STRICT CHECK
                if (newest.range !== previousRangeRef.current) {
                    if (newest.range === "WARNING") {
                        if (popupSettingsRef.current.attention) {
                            showPopup("Water has reached the WARNING threshold! Please prepare.", "warn");
                        }
                    } 
                    else if (newest.range === "CRITICAL") {
                        if (popupSettingsRef.current.critical) {
                            showPopup("Water has reached the CRITICAL threshold! Immediate action required!", "error");
                        }
                    }           
                }
                    previousRangeRef.current = newest.range;

                    if (newest.distance > usonic_genbox_dist && !custom31TriggeredRef.current) {
                        showPopup("Notice: River level has exceeded "+String(usonic_genbox_dist)+" ft. \nPlease slide the frame up.", "info");
                        custom31TriggeredRef.current = true;
                    } else if (newest.distance <= usonic_genbox_dist && custom31TriggeredRef.current) {
                        custom31TriggeredRef.current = false;
                    }

                    setLatestReading(newest);
                }
            } catch (e) { 
                console.error("Global monitor error:", e);
            }
        };

        fetchLatest();
        const interval = setInterval(fetchLatest, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    return (
        <GlobalContext.Provider value={{ popupSettings, setPopupSettings }}>
            {children}
            {popup.visible && (
                <Popup
                    message={popup.message}
                    severity={popup.severity}
                    onClose={() => setPopup(prev => ({ ...prev, visible: false }))}
                />
            )}
        </GlobalContext.Provider>
    );
}