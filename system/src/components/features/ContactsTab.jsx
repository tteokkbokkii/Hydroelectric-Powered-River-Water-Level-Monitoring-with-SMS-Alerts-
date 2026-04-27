import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Dropdown } from 'primereact/dropdown';
import mqtt from 'mqtt';

const currentIP = window.location.hostname || 'rivermonitoring.local';
const MQTT_BROKER = `ws://${currentIP}:9001`;
const API_BASE = `http://${currentIP}:5000/api`; // ADDED: API base for fetching logs
const CONTACTS_LIST_TOPIC = 'contacts/list';
const CONTACTS_UPDATE_TOPIC = 'contacts/update';
const SMS_COMMAND_TOPIC = 'sms/command';

// ---------- Popup Component ----------
const Popup = ({
  message,
  severity,
  onClose,
  buttons = [{ label: 'OK', onClick: null, autoClose: true }],
}) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleButtonClick = (btn) => {
    if (btn.onClick) btn.onClick();
    if (btn.autoClose !== false) onClose();
  };

  const isSingleButton = buttons.length === 1;

  return ReactDOM.createPortal(
    <div className="notification-overlay" onClick={onClose}>
      <div className={`notification-card ${severity}`} onClick={(e) => e.stopPropagation()}>
        <button className="notification-close-x" onClick={onClose}>×</button>
        <div className="notification-header">
          <h3>{severity === 'error' ? '🚨 CRITICAL ALERT' : severity === 'warn' ? '⚠️ WARNING' : severity === 'info' ? 'ℹ️ SYSTEM MESSAGE' : '✅ SUCCESS'}</h3>
        </div>
        <div className="notification-body">
          <p>{message}</p>
        </div>
        <div className={`notification-actions ${isSingleButton ? 'single-button' : ''}`}>
          {buttons.map((btn, idx) => (
            <button key={idx} className={`action-btn ${idx === 0 ? 'primary' : 'secondary'}`} onClick={() => handleButtonClick(btn)}>
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};

const ContactsTab = () => {
  const [contacts, setContacts] = useState([]);
  const [mqttClient, setMqttClient] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [popup, setPopup] = useState({ visible: false, message: '', severity: '', buttons: [] });
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [customMessage, setCustomMessage] = useState("testing GSM, SMS sent.");
  const [smsLogs, setSmsLogs] = useState([]);

  const showPopup = (message, severity, buttons) => {
    setPopup({ visible: true, message, severity, buttons: buttons || [{ label: 'OK', onClick: null, autoClose: true }] });
  };
  const closePopup = () => setPopup({ visible: false, message: '', severity: '', buttons: [] });

  // --- ADDED: Fetch SMS Logs from Backend API ---
  useEffect(() => {
    const fetchSmsLogs = async () => {
      try {
        const response = await fetch(`${API_BASE}/sms_logs`);
        if (response.ok) {
          const data = await response.json();
          setSmsLogs(data);
        }
      } catch (error) {
        console.error("Error fetching SMS logs:", error);
      }
    };

    fetchSmsLogs();
    const logInterval = setInterval(fetchSmsLogs, 5000); 
    return () => clearInterval(logInterval);
  }, []);

  // --- MQTT connection ---
  useEffect(() => {
    const client = mqtt.connect(MQTT_BROKER);
    client.on('connect', () => {
      console.log('Connected to MQTT via WebSockets');
      client.subscribe(CONTACTS_LIST_TOPIC);
      setMqttClient(client);
    });
    client.on('message', (topic, message) => {
      if (topic === CONTACTS_LIST_TOPIC) {
        try {
          const parsed = JSON.parse(message.toString());
          if (Array.isArray(parsed)) setContacts(parsed);
        } catch (e) {
          console.error("Failed to parse contacts:", e);
        }
      }
    });
    return () => { if (client) client.end(); };
  }, []);

  // ---------- Dropdown options ----------
  const recipientOptions = contacts
    .filter(c => c.name && c.phone)
    .map(c => ({ label: `${c.name} (${c.phone})`, value: c.name }));

  const handleSend = () => {
    if (!selectedRecipient) {
      showPopup('Please select a recipient', 'error');
      return;
    }
    const contact = contacts.find(c => c.name === selectedRecipient);
    if (!contact) return;

    showPopup(`Send message to "${contact.name}"?`, 'info', [
      {
        label: 'YES',
        autoClose: false,
        onClick: () => {
          closePopup();
          if (mqttClient && mqttClient.connected) {
            
            // CHANGED: Added 'name' to the payload so it logs correctly
            const payload = JSON.stringify({
              command: "SEND_TEST_SMS",
              phone: contact.phone,
              name: contact.name, 
              message: customMessage
            });
            mqttClient.publish(SMS_COMMAND_TOPIC, payload);
            showPopup('SMS command sent to ESP32', 'success');
          } else {
            showPopup('MQTT not connected', 'error');
          }
        }
      },
      { label: 'NO', onClick: () => {} }
    ]);
  };

  const addRow = () => {
    const newContacts = [...contacts, { id: Date.now(), name: '', phone: '', alertLevel: 'ALL' }];
    setContacts(newContacts);
  };

  const deleteRow = (id) => {
    const newContacts = contacts.filter(c => c.id !== id);
    setContacts(newContacts);
  };

  const updateContact = (id, field, value) => {
    const newContacts = contacts.map(c => c.id === id ? { ...c, [field]: value } : c);
    setContacts(newContacts);
  };

  const saveContacts = () => {
    for (let c of contacts) {
      if (!c.name.trim() || !c.phone.trim()) {
        showPopup('All contacts must have a Name and Phone Number.', 'error');
        return;
      }
    }
    setIsSaving(true);
    if (mqttClient && mqttClient.connected) {
      mqttClient.publish(CONTACTS_UPDATE_TOPIC, JSON.stringify(contacts), { retain: true });
      showPopup('Contacts saved successfully!', 'success');
    } else {
      showPopup('Cannot save: MQTT disconnected.', 'error');
    }
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="card-container two-columns contacts-layout">
      <div className="card-panel left-flex">
        <div className="panel-header-row">
          <h2 className="panel-title">PHONEBOOK</h2>
          <button className="action-button save-btn" onClick={saveContacts} disabled={isSaving}>
            {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
        </div>
        <div className="contacts-table-wrapper flex-grow">
          <table className="contacts-table">
            <thead>
              <tr>
                <th style={{width: '30%'}}>Name</th>
                <th style={{width: '30%'}}>Phone Number</th>
                <th style={{width: '30%'}}>Alert Level</th>
                <th style={{width: '10%'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td><input type="text" value={contact.name} onChange={(e) => updateContact(contact.id, 'name', e.target.value)} placeholder="Full Name" /></td>
                  <td><input type="text" value={contact.phone} onChange={(e) => updateContact(contact.id, 'phone', e.target.value)} placeholder="09123456789" /></td>
                  <td>
                    <select value={contact.alertLevel} onChange={(e) => updateContact(contact.id, 'alertLevel', e.target.value)}>
                      <option value="ALL">ALL</option>
                      <option value="WARNING">WARNING ONLY</option>
                      <option value="CRITICAL">CRITICAL ONLY</option>
                    </select>
                  </td>
                  <td><button className="delete-btn" onClick={() => deleteRow(contact.id)}>DEL</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="add-row-btn" onClick={addRow} disabled={isSaving}>+ ADD NEW CONTACT</button>
        </div>

        <div className="sms-testing-section">
          <h3 className="section-subtitle">MANUAL SMS TESTING</h3>
          <div className="testing-grid">
            <div className="test-left">
              <label>Custom Message:</label>
              <textarea 
                className="modern-textarea" 
                value={customMessage} 
                onChange={(e) => setCustomMessage(e.target.value)} 
                maxLength={100}
                disabled={isSaving}
              />
              <div className="char-count">{customMessage.length}/100</div>
            </div>
            <div className="test-right">
              <label>Select Recipient:</label>
              <div className="recipient-action-row">
                <Dropdown
                  value={selectedRecipient}
                  options={recipientOptions}
                  onChange={(e) => setSelectedRecipient(e.value)}
                  placeholder="Select Contact"
                  className="sms-dropdown"
                  disabled={isSaving}
                />
                <button className="send-btn primary" onClick={handleSend} disabled={isSaving}>
                  SEND MESSAGE
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-panel right-flex">
        <div className="panel-header-row">
          <h2 className="panel-title">SMS LOGS</h2>
        </div>
        <div className="logs-container">
          <div className="logs-scrollable">
            <table className="logs-table">
              <tbody>
                {smsLogs.length === 0 ? (
                  <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>No SMS logs found.</td></tr>
                ) : (
                  smsLogs.map((log, idx) => (
                    <tr key={log.id || idx} className={`log-row ${log.log_type === 'ALERT' ? 'alrt' : 'maint'}`}>
                      {/* CHANGED: Uses log.log_type instead of log.type */}
                      <td className="l-time">{log.timestamp || "--:--"}</td>
                      {/* CHANGED: Checks for ALERT, otherwise displays TEST */}
                      <td className="l-tag">[{log.log_type === 'ALERT' ? 'ALERT' : 'TEST'}]</td>
                      <td className="l-sender" style={{ lineHeight: '1.4' }}>
                        {/* CHANGED: Uses correct database variables to show Name, Phone, and Water Level */}
                        <strong>{log.recipient_name}</strong> ({log.recipient_phone})
                        {log.log_type === 'ALERT' && (
                          <div style={{ fontSize: '0.85em', color: '#666', marginTop: '2px' }}>
                            Water Lvl: {log.water_level} ft | Status: {log.alert_level}
                          </div>
                        )}
                      </td>
                      <td className="l-msg">{log.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {popup.visible && (
        <Popup message={popup.message} severity={popup.severity} buttons={popup.buttons} onClose={closePopup} />
      )}
    </div>
  );
};

export default ContactsTab;